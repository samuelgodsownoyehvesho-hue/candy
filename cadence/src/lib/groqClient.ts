import { upload } from '@vercel/blob/client';
import type { LyricLine } from '@/types/lyrics';

export interface TranscriptionResult {
  lines: LyricLine[];
}

// Just under Vercel's configured maxDuration (60s) for the transcribe
// function — if we haven't heard back by then, the function itself is
// about to be killed anyway, so we surface a clear message instead of
// leaving the person staring at a spinner that will never resolve.
const TRANSCRIBE_TIMEOUT_MS = 55_000;

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timer));
}

/**
 * Uploads the audio directly to Vercel Blob storage from the browser (via
 * the token handshake at /api/audio-upload), then calls
 * /api/whisper-transcribe with the resulting URL. The audio bytes never
 * pass through our serverless function's request body, which is what
 * removes the ~3.2MB ceiling an earlier base64-through-the-function
 * approach had — uploads are limited only by Groq's own ~25MB Whisper API
 * cap instead.
 *
 * Returns an error object (rather than throwing) on any failure —
 * including running locally under plain `vite dev` with no serverless
 * runtime, a missing/invalid GROQ_API_KEY, a missing Blob store, or the
 * transcription taking longer than Vercel's function time limit — so the
 * caller can show a clear message and fall back to adding lines manually.
 * Every step is logged so browser console output can be correlated with
 * Vercel's Function Logs for the same request.
 */
export async function requestTranscription(
  audioBlob: Blob,
  fileName: string,
  mimeType: string,
): Promise<TranscriptionResult | { error: string }> {
  try {
    console.log('[groqClient] uploading audio to Vercel Blob', { fileName, size: audioBlob.size, mimeType });

    const uploaded = await upload(fileName, audioBlob, {
      access: 'public',
      handleUploadUrl: '/api/audio-upload',
    });

    console.log('[groqClient] upload complete', { url: uploaded.url });
    console.log('[groqClient] POSTing to /api/whisper-transcribe');

    const res = await fetchWithTimeout(
      '/api/whisper-transcribe',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: uploaded.url, fileName, mimeType }),
      },
      TRANSCRIBE_TIMEOUT_MS,
    );

    console.log('[groqClient] transcribe response received', { status: res.status });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('[groqClient] transcribe request failed', data);
      return { error: data?.error ?? `Transcription failed (${res.status}).` };
    }
    if (!data || !Array.isArray(data.lines)) {
      console.error('[groqClient] unexpected response shape', data);
      return { error: 'Transcription returned an unexpected response.' };
    }

    console.log('[groqClient] transcription succeeded', { lineCount: data.lines.length });
    return { lines: data.lines };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[groqClient] request timed out client-side after', TRANSCRIBE_TIMEOUT_MS, 'ms');
      return {
        error:
          "Transcription timed out after 55 seconds. Longer tracks can take a while — try a shorter clip, or check your Vercel project's Function Logs to see how far it got.",
      };
    }
    console.error('[groqClient] unexpected error', err);
    return {
      error:
        err instanceof Error && err.message
          ? `Could not upload or transcribe this file: ${err.message}`
          : 'Could not reach the transcription service. This only runs on Vercel (or via `vercel dev` locally) — plain `vite dev` does not run serverless functions.',
    };
  }
}
