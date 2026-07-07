import type { LyricLine } from '@/types/lyrics';

export interface TranscriptionResult {
  lines: LyricLine[];
}

// Vercel Hobby serverless functions cap request bodies at 4.5MB.
// Base64 inflates size by ~33%, so the raw audio ceiling is 4.5 / 1.33 ≈ 3.3MB.
// We use 3MB as a conservative safe limit.
const MAX_RAW_BYTES = 3 * 1024 * 1024;
const TRANSCRIBE_TIMEOUT_MS = 55_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix — we only want the raw base64 payload
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Sends the audio directly to /api/whisper-transcribe as base64 in a
 * single POST request — no separate upload step, no Vercel Blob storage,
 * no two-step handshake. The previous Vercel Blob approach was aborting
 * on mobile because the direct browser-to-Blob-storage upload was timing
 * out on mobile connections.
 *
 * Trade-off: Vercel Hobby limits serverless request bodies to 4.5MB,
 * which limits us to ~3MB of raw audio. For a typical 1-3 minute MP3 at
 * 128kbps that is well within range. Files over 3MB get a clear upfront
 * error instead of a silent hang.
 */
export async function requestTranscription(
  audioBlob: Blob,
  fileName: string,
  mimeType: string,
): Promise<TranscriptionResult | { error: string }> {
  if (audioBlob.size > MAX_RAW_BYTES) {
    return {
      error: `This file is ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB, which exceeds the ~3MB limit for in-browser transcription on Vercel's free tier. Try a shorter clip or export a lower-bitrate MP3 first.`,
    };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

  try {
    console.log('[groqClient] converting audio to base64', { size: audioBlob.size, mimeType });
    const audioBase64 = await blobToBase64(audioBlob);

    console.log('[groqClient] POSTing to /api/whisper-transcribe');
    const res = await fetch('/api/whisper-transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, fileName, mimeType }),
      signal: controller.signal,
    });

    console.log('[groqClient] response received', { status: res.status });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('[groqClient] transcribe failed', data);
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
      console.error('[groqClient] request timed out after', TRANSCRIBE_TIMEOUT_MS, 'ms');
      return {
        error: "Transcription timed out after 55 seconds. Try a shorter clip or check your Vercel Function Logs.",
      };
    }
    console.error('[groqClient] unexpected error', err);
    return {
      error: err instanceof Error && err.message
        ? `Transcription failed: ${err.message}`
        : 'Could not reach the transcription service.',
    };
  } finally {
    window.clearTimeout(timer);
  }
}
