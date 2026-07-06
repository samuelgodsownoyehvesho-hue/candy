import { nanoid } from 'nanoid';
import { del } from '@vercel/blob';

/**
 * Vercel serverless function: given a Vercel Blob URL (audio was already
 * uploaded directly to Blob storage by the client, see api/audio-upload.js,
 * so it never passed through this function's request body), fetches the
 * audio server-side and forwards it to Groq's Whisper API for
 * transcription.
 *
 * Every fetch this function makes (to Blob storage, to Groq) is wrapped in
 * its own AbortController timeout, independent of Vercel's own
 * maxDuration — so a hanging upstream request surfaces a clear error well
 * before the whole function gets killed, rather than silently eating the
 * entire time budget. Every code path logs a step marker and ends in
 * exactly one res.json() call; a top-level try/catch guarantees that even
 * a genuinely unexpected throw still produces a single clean response
 * instead of the function returning nothing.
 */

const MAX_RAW_BYTES = 25 * 1024 * 1024; // Groq's own Whisper upload cap
const BLOB_FETCH_TIMEOUT_MS = 20_000;
const GROQ_FETCH_TIMEOUT_MS = 35_000;

function withTimeout(promiseFactory, timeoutMs, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return promiseFactory(controller.signal)
    .catch((err) => {
      if (err.name === 'AbortError') {
        throw new Error(`${label} timed out after ${timeoutMs / 1000}s`);
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  console.log('[whisper-transcribe] request received', { method: req.method });

  try {
    if (req.method !== 'POST') {
      console.log('[whisper-transcribe] rejecting non-POST request');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[whisper-transcribe] GROQ_API_KEY is not set');
      res.status(500).json({
        error: 'Server is not configured with a Groq API key (GROQ_API_KEY is not set).',
      });
      return;
    }

    const { audioUrl, fileName, mimeType } = req.body ?? {};
    if (typeof audioUrl !== 'string' || audioUrl.length === 0) {
      console.warn('[whisper-transcribe] missing audioUrl in request body', req.body);
      res.status(400).json({ error: 'Request must include a non-empty `audioUrl` string.' });
      return;
    }

    console.log('[whisper-transcribe] downloading audio from blob', { audioUrl, fileName });

    let buffer;
    try {
      const audioRes = await withTimeout(
        (signal) => fetch(audioUrl, { signal }),
        BLOB_FETCH_TIMEOUT_MS,
        'Blob download',
      );
      if (!audioRes.ok) {
        console.error('[whisper-transcribe] blob fetch returned non-OK status', audioRes.status);
        res.status(502).json({ error: `Could not fetch the uploaded audio (${audioRes.status}).` });
        return;
      }
      const arrayBuffer = await audioRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('[whisper-transcribe] blob download complete', { bytes: buffer.byteLength });
    } catch (err) {
      console.error('[whisper-transcribe] blob download failed', err);
      res.status(502).json({
        error: `Could not fetch the uploaded audio: ${err instanceof Error ? err.message : 'unknown error'}`,
      });
      return;
    }

    if (buffer.byteLength > MAX_RAW_BYTES) {
      console.warn('[whisper-transcribe] file too large', { bytes: buffer.byteLength });
      res.status(413).json({
        error: `That file is too large to transcribe (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Groq's Whisper API caps uploads at ~25MB — try a shorter clip or a more compressed format.`,
      });
      return;
    }

    let data;
    try {
      const blob = new Blob([buffer], { type: mimeType || 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', blob, fileName || 'audio.mp3');
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');
      formData.append('timestamp_granularities[]', 'segment');

      console.log('[whisper-transcribe] sending request to Groq');

      const response = await withTimeout(
        (signal) =>
          fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
            signal,
          }),
        GROQ_FETCH_TIMEOUT_MS,
        'Groq request',
      );

      console.log('[whisper-transcribe] groq response received', { status: response.status });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[whisper-transcribe] groq API error', response.status, errText.slice(0, 500));
        res.status(502).json({ error: `Groq API error (${response.status}): ${errText.slice(0, 300)}` });
        return;
      }

      data = await response.json();
      console.log('[whisper-transcribe] groq response parsed', {
        segments: Array.isArray(data.segments) ? data.segments.length : 0,
        words: Array.isArray(data.words) ? data.words.length : 0,
      });
    } catch (err) {
      console.error('[whisper-transcribe] groq request failed', err);
      res.status(502).json({
        error: `Failed to reach the Groq API: ${err instanceof Error ? err.message : 'unknown error'}`,
      });
      return;
    }

    const segments = Array.isArray(data.segments) ? data.segments : [];
    const words = Array.isArray(data.words) ? data.words : [];

    console.log('[whisper-transcribe] building lines from segments/words');

    let lines;
    if (segments.length > 0) {
      lines = segments.map((seg) => {
        const segWords = words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end + 0.05);
        const lineWords =
          segWords.length > 0
            ? segWords.map((w) => ({
                id: nanoid(6),
                text: (w.word || '').trim(),
                startTime: Math.max(seg.start, w.start),
                endTime: Math.min(seg.end, Math.max(w.end, w.start + 0.05)),
              }))
            : [];
        return {
          id: nanoid(8),
          text: (seg.text || '').trim(),
          startTime: seg.start,
          endTime: seg.end,
          words: lineWords,
        };
      });
    } else if (words.length > 0) {
      lines = [];
      let current = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const prev = words[i - 1];
        if (prev && w.start - prev.end > 0.6 && current.length > 0) {
          lines.push(current);
          current = [];
        }
        current.push(w);
        if (current.length >= 10) {
          lines.push(current);
          current = [];
        }
      }
      if (current.length > 0) lines.push(current);

      lines = lines.map((group) => ({
        id: nanoid(8),
        text: group.map((w) => w.word.trim()).join(' '),
        startTime: group[0].start,
        endTime: group[group.length - 1].end,
        words: group.map((w) => ({
          id: nanoid(6),
          text: w.word.trim(),
          startTime: w.start,
          endTime: w.end,
        })),
      }));
    } else {
      lines = [];
    }

    // Storage hygiene: awaited (not fire-and-forget) so the function fully
    // finishes its own work before responding, rather than leaving a
    // dangling promise after the response is sent.
    try {
      await del(audioUrl);
      console.log('[whisper-transcribe] temporary blob deleted');
    } catch (err) {
      console.warn('[whisper-transcribe] blob cleanup failed (non-fatal)', err);
    }

    console.log('[whisper-transcribe] sending response to client', { lineCount: lines.length });
    res.status(200).json({ lines, usedAI: true });
  } catch (err) {
    // Final safety net: any unexpected throw anywhere above still produces
    // exactly one clean JSON response instead of the function hanging or
    // returning nothing.
    console.error('[whisper-transcribe] unexpected error', err);
    res.status(500).json({
      error: `Unexpected server error: ${err instanceof Error ? err.message : 'unknown error'}`,
    });
  }
}
