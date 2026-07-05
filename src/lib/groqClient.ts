import { upload } from '@vercel/blob/client';
import type { LyricLine } from '@/types/lyrics';

export interface TranscriptionResult {
  lines: LyricLine[];
}

/**
 * Uploads the audio directly to Vercel Blob storage from the browser (via
 * the token handshake at /api/audio-upload), then calls
 * /api/whisper-transcribe with the resulting URL. The audio bytes never
 * pass through our serverless function's request body, which is what
 * removes the earlier ~3.2MB ceiling the base64-through-the-function
 * approach had — uploads are limited only by Groq's own ~25MB Whisper API
 * cap instead.
 *
 * Returns an error object (rather than throwing) on any failure —
 * including running locally under plain `vite dev` with no serverless
 * runtime, a missing/invalid GROQ_API_KEY, or a missing Blob store — so
 * the caller can show a clear message and fall back to adding lines
 * manually.
 */
export async function requestTranscription(
  audioBlob: Blob,
  fileName: string,
  mimeType: string,
): Promise<TranscriptionResult | { error: string }> {
  try {
    const uploaded = await upload(fileName, audioBlob, {
      access: 'public',
      handleUploadUrl: '/api/audio-upload',
    });

    const res = await fetch('/api/whisper-transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl: uploaded.url, fileName, mimeType }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { error: data?.error ?? `Transcription failed (${res.status}).` };
    }
    if (!data || !Array.isArray(data.lines)) {
      return { error: 'Transcription returned an unexpected response.' };
    }
    return { lines: data.lines };
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message
          ? `Could not upload or transcribe this file: ${err.message}`
          : 'Could not reach the transcription service. This only runs on Vercel (or via `vercel dev` locally) — plain `vite dev` does not run serverless functions.',
    };
  }
}
