import type { LyricLine } from '@/types/lyrics';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:audio/mpeg;base64," prefix — the server only wants the payload
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface TranscriptionResult {
  lines: LyricLine[];
}

/**
 * Sends the project's audio to `/api/whisper-transcribe` (a Vercel
 * serverless function proxying Groq's Whisper API) and returns real,
 * audio-derived line + word timestamps. Returns null on any failure —
 * including running locally under plain `vite dev` with no serverless
 * runtime, a missing/invalid GROQ_API_KEY, or the file exceeding Vercel's
 * request body size limit — so the caller can show a clear error and fall
 * back to manually adding lines.
 */
export async function requestTranscription(
  audioBlob: Blob,
  fileName: string,
  mimeType: string,
): Promise<TranscriptionResult | { error: string }> {
  try {
    const audioBase64 = await blobToBase64(audioBlob);
    const res = await fetch('/api/whisper-transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, fileName, mimeType }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { error: data?.error ?? `Transcription failed (${res.status}).` };
    }
    if (!data || !Array.isArray(data.lines)) {
      return { error: 'Transcription returned an unexpected response.' };
    }
    return { lines: data.lines };
  } catch {
    return {
      error:
        'Could not reach the transcription service. This endpoint only runs on Vercel (or via `vercel dev` locally) — plain `vite dev` does not run serverless functions.',
    };
  }
}
