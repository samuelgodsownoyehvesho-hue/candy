import { nanoid } from 'nanoid';

/**
 * Vercel serverless function: sends the uploaded track to Groq's Whisper
 * API for real audio transcription with word + segment level timestamps,
 * and returns lyric lines built from that. The API key lives in the
 * server-side GROQ_API_KEY env var and never reaches the client.
 *
 * Intentionally plain JS with the word-grouping logic duplicated inline
 * (rather than importing from src/lib/lyrics.ts) to keep this Vercel
 * zero-config function bundle fully self-contained — see the doc comment
 * on `groupWordsIntoLines` in src/lib/lyrics.ts, which is the tested
 * client-side equivalent of the same small algorithm.
 */

// Vercel Hobby plan caps serverless function request bodies at 4.5MB. Base64
// inflates size by ~33%, so we cap the raw audio at ~3.2MB to leave
// headroom under that limit after encoding + JSON overhead.
const MAX_RAW_BYTES = 3.2 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'Server is not configured with a Groq API key (GROQ_API_KEY is not set).',
    });
    return;
  }

  const { audioBase64, fileName, mimeType } = req.body ?? {};
  if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
    res.status(400).json({ error: 'Request must include a non-empty `audioBase64` string.' });
    return;
  }

  const buffer = Buffer.from(audioBase64, 'base64');
  if (buffer.byteLength > MAX_RAW_BYTES) {
    res.status(413).json({
      error: `That file is too large to transcribe here (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Vercel's free-tier serverless functions cap request bodies at 4.5MB, which limits us to roughly ${(MAX_RAW_BYTES / 1024 / 1024).toFixed(1)}MB of raw audio. Try a shorter clip or a more compressed format (e.g. a lower-bitrate MP3).`,
    });
    return;
  }

  try {
    const blob = new Blob([buffer], { type: mimeType || 'audio/mpeg' });
    const formData = new FormData();
    formData.append('file', blob, fileName || 'audio.mp3');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `Groq API error (${response.status}): ${errText.slice(0, 300)}` });
      return;
    }

    const data = await response.json();
    const segments = Array.isArray(data.segments) ? data.segments : [];
    const words = Array.isArray(data.words) ? data.words : [];

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
      // Fallback: no segments returned, so chunk the flat word list into
      // lines using natural pauses between words (>0.6s gap) as line breaks.
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

    res.status(200).json({ lines, usedAI: true });
  } catch (err) {
    res.status(500).json({
      error: `Failed to reach the Groq API: ${err instanceof Error ? err.message : 'unknown error'}`,
    });
  }
}
