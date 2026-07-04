import type { LineTiming, SilenceGap } from '@/types/lyrics';

export interface LineSyncRequestPayload {
  lines: string[];
  durationSeconds: number;
  silenceGaps: SilenceGap[];
}

/**
 * Calls the `/api/grok-sync` Vercel serverless function, which holds the
 * Grok API key server-side. Returns null (rather than throwing) on any
 * failure — including running locally under plain `vite dev` with no
 * serverless runtime, where this endpoint simply doesn't exist — so the
 * caller can fall back to the deterministic proportional algorithm and the
 * feature keeps working end-to-end either way.
 */
export async function requestLineSyncFromGrok(
  payload: LineSyncRequestPayload,
): Promise<LineTiming[] | null> {
  try {
    const res = await fetch('/api/grok-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.timings)) return null;
    return data.timings as LineTiming[];
  } catch {
    return null;
  }
}
