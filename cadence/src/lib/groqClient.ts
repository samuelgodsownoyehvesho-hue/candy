import { upload } from '@vercel/blob/client';
import type { LyricLine } from '@/types/lyrics';

export interface TranscriptionResult {
  lines: LyricLine[];
}

// The upload step (browser -> Vercel Blob storage directly) previously had
// no timeout at all — if it stalled, the whole flow hung forever before
// ever reaching /api/whisper-transcribe, which is exactly what the Vercel
// Function Logs showed: a single successful /api/audio-upload entry (the
// token handshake) and nothing after it.
const UPLOAD_TIMEOUT_MS = 30_000;
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
 * Both the upload step and the transcribe request have their own
 * independent timeouts, so a stall in either one surfaces a clear error
 * instead of leaving the UI stuck indefinitely. Every step is logged so
 * browser console output can be correlated with Vercel's Function Logs.
 */
export async function requestTranscription(
  audioBlob: Blob,
  fileName: string,
  mimeType: string,
): Promise<TranscriptionResult | { error: string }> {
  const uploadController = new AbortController();
  const uploadTimer = window.setTimeout(() => uploadController.abort(), UPLOAD_TIMEOUT_MS);

  let uploadedUrl: string;
  try {
    console.log('[groqClient] uploading audio to Vercel Blob', { fileName, size: audioBlob.size, mimeType });

    const uploaded = await upload(fileName, audioBlob, {
      access: 'public',
      handleUploadUrl: '/api/audio-upload',
      abortSignal: uploadController.signal,
      onUploadProgress: ({ percentage }) => {
        console.log('[groqClient] upload progress', `${percentage}%`);
      },
    });

    uploadedUrl = uploaded.url;
    console.log('[groqClient] upload complete', { url: uploadedUrl });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[groqClient] upload timed out client-side after', UPLOAD_TIMEOUT_MS, 'ms');
      return {
        error:
          'Uploading the audio timed out after 30 seconds. This can happen on a slow or unstable connection — try again, or try a smaller file.',
      };
    }
    console.error('[groqClient] upload failed', err);
    return {
      error: err instanceof Error ? `Could not upload the audio: ${err.message}` : 'Could not upload the audio.',
    };
  } finally {
    window.clearTimeout(uploadTimer);
  }

  try {
    console.log('[groqClient] POSTing to /api/whisper-transcribe');

    const res = await fetchWithTimeout(
      '/api/whisper-transcribe',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: uploadedUrl, fileName, mimeType }),
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
      console.error('[groqClient] transcribe request timed out client-side after', TRANSCRIBE_TIMEOUT_MS, 'ms');
      return {
        error:
          "Transcription timed out after 55 seconds. Longer tracks can take a while — try a shorter clip, or check your Vercel project's Function Logs to see how far it got.",
      };
    }
    console.error('[groqClient] unexpected error', err);
    return {
      error:
        err instanceof Error && err.message
          ? `Could not transcribe this file: ${err.message}`
          : 'Could not reach the transcription service. This only runs on Vercel (or via `vercel dev` locally) — plain `vite dev` does not run serverless functions.',
    };
  }
}
