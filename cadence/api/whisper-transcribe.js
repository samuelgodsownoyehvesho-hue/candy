import { nanoid } from 'nanoid';

/**
 * Receives audio as base64 in the request body, decodes it server-side,
 * and forwards it to Groq's Whisper API for transcription with word and
 * segment level timestamps.
 *
 * Single-request approach — no Vercel Blob storage, no two-step upload
 * handshake. The previous Blob approach was aborting on mobile because
 * the direct browser-to-Blob upload kept timing out on mobile connections.
 *
 * Request body size limit: Vercel Hobby caps at 4.5MB. Base64 inflates
 * by ~33%, so this handles up to ~3MB of raw audio — enforced on the
 * client before this function is ever called.
 */

const MAX_RAW_BYTES = 3.5 * 1024 * 1024; // slight server-side buffer above client's 3MB cap
const GROQ_TIMEOUT_MS = 50_000;

function withTimeout(promiseFactory, timeoutMs, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return promiseFactory(controller.signal)
    .catch((err) => {
      if (err.name === 'AbortError') throw new Error(`${label} timed out after ${timeoutMs / 1000}s`);
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  console.log('[whisper-transcribe] request received', { method: req.method });

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[whisper-transcribe] GROQ_API_KEY not set');
      res.status(500).json({ error: 'Server is not configured with a Groq API key (GROQ_API_KEY is not set).' });
      return;
    }

    const { audioBase64, fileName, mimeType } = req.body ?? {};
    if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
      console.warn('[whisper-transcribe] missing audioBase64 in body');
      res.status(400).json({ error: 'Request must include a non-empty `audioBase64` string.' });
      return;
    }

    console.log('[whisper-transcribe] decoding base64 audio', { fileName, mimeType });
    const buffer = Buffer.from(audioBase64, 'base64');
    console.log('[whisper-transcribe] decoded', { bytes: buffer.byteLength });

    if (buffer.byteLength > MAX_RAW_BYTES) {
      console.warn('[whisper-transcribe] file too large', { bytes: buffer.byteLength });
      res.status(413).json({
        error: `File too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Maximum is ~3MB. Try a shorter clip or a lower-bitrate MP3.`,
      });
      return;
    }

    const blob = new Blob([buffer], { type: mimeType || 'audio/mpeg' });
    const formData = new FormData();
    formData.append('file', blob, fileName || 'audio.mp3');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    console.log('[whisper-transcribe] sending to Groq Whisper');

    let groqRes;
    try {
      groqRes = await withTimeout(
        (signal) => fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
          signal,
        }),
        GROQ_TIMEOUT_MS,
        'Groq request',
      );
    } catch (err) {
      console.error('[whisper-transcribe] Groq request failed', err);
      res.status(502).json({ error: `Failed to reach Groq: ${err instanceof Error ? err.message : 'unknown error'}` });
      return;
    }

    console.log('[whisper-transcribe] Groq responded', { status: groqRes.status });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[whisper-transcribe] Groq error', groqRes.status, errText.slice(0, 400));
      res.status(502).json({ error: `Groq API error (${groqRes.status}): ${errText.slice(0, 300)}` });
      return;
    }

    const data = await groqRes.json();
    const segments = Array.isArray(data.segments) ? data.segments : [];
    const words = Array.isArray(data.words) ? data.words : [];
    console.log('[whisper-transcribe] parsed response', { segments: segments.length, words: words.length });

    let lines;
    if (segments.length > 0) {
      lines = segments.map((seg) => {
        const segWords = words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end + 0.05);
        return {
          id: nanoid(8),
          text: (seg.text || '').trim(),
          startTime: seg.start,
          endTime: seg.end,
          words: segWords.length > 0
            ? segWords.map((w) => ({
                id: nanoid(6),
                text: (w.word || '').trim(),
                startTime: Math.max(seg.start, w.start),
                endTime: Math.min(seg.end, Math.max(w.end, w.start + 0.05)),
              }))
            : [],
        };
      });
    } else if (words.length > 0) {
      const groups = [];
      let current = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const prev = words[i - 1];
        if (prev && w.start - prev.end > 0.6 && current.length > 0) {
          groups.push(current);
          current = [];
        }
        current.push(w);
        if (current.length >= 10) { groups.push(current); current = []; }
      }
      if (current.length > 0) groups.push(current);
      lines = groups.map((g) => ({
        id: nanoid(8),
        text: g.map((w) => w.word.trim()).join(' '),
        startTime: g[0].start,
        endTime: g[g.length - 1].end,
        words: g.map((w) => ({ id: nanoid(6), text: w.word.trim(), startTime: w.start, endTime: w.end })),
      }));
    } else {
      lines = [];
    }

    console.log('[whisper-transcribe] sending response', { lineCount: lines.length });
    res.status(200).json({ lines, usedAI: true });

  } catch (err) {
    console.error('[whisper-transcribe] unexpected error', err);
    res.status(500).json({ error: `Unexpected error: ${err instanceof Error ? err.message : 'unknown error'}` });
  }
}
