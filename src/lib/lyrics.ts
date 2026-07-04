import { nanoid } from 'nanoid';
import type { LineTiming, LyricLine, LyricWord, SilenceGap } from '@/types/lyrics';
import { requestLineSyncFromGrok } from '@/lib/grokClient';

export interface SyncResult {
  lines: LyricLine[];
  usedAI: boolean;
}

/**
 * Tries Grok first (line-level pacing informed by real silence-gap
 * detection); if that's unavailable for any reason, falls back to the
 * deterministic proportional algorithm below. Word-level timing is always
 * derived locally via `buildWordsForLine`, regardless of which path
 * produced the line timings — see that function's doc comment for why.
 */
export async function generateLyricSync(
  rawLines: string[],
  durationSeconds: number,
  silenceGaps: SilenceGap[],
): Promise<SyncResult> {
  const aiTimings = await requestLineSyncFromGrok({ lines: rawLines, durationSeconds, silenceGaps });

  const timings = aiTimings ?? naiveProportionalTimings(rawLines, durationSeconds, silenceGaps);
  const usedAI = aiTimings !== null;

  return { lines: buildLinesFromTimings(rawLines, timings), usedAI };
}


export function parseRawLyrics(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Splits a line's allotted time range across its words, weighted by word
 * character length so "extraordinary" gets more time than "a". This is
 * deterministic local math, not an AI guess — Grok (or the fallback
 * algorithm) only proposes line-level ranges; word-level detail is always
 * derived this way, and is exactly what a person is expected to fine-tune
 * by hand afterward.
 */
export function buildWordsForLine(lineText: string, startTime: number, endTime: number): LyricWord[] {
  const tokens = lineText.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const weights = tokens.map((t) => Math.max(1, t.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const duration = Math.max(0.01, endTime - startTime);

  let cursor = startTime;
  return tokens.map((text, i) => {
    const share = (weights[i] / totalWeight) * duration;
    const wordStart = cursor;
    const wordEnd = i === tokens.length - 1 ? endTime : cursor + share;
    cursor = wordEnd;
    return { id: nanoid(6), text, startTime: wordStart, endTime: wordEnd };
  });
}

export function buildLinesFromTimings(rawLines: string[], timings: LineTiming[]): LyricLine[] {
  const byIndex = new Map(timings.map((t) => [t.lineIndex, t]));
  return rawLines.map((text, i) => {
    const timing = byIndex.get(i) ?? { lineIndex: i, startTime: 0, endTime: 0 };
    return {
      id: nanoid(8),
      text,
      startTime: timing.startTime,
      endTime: timing.endTime,
      words: buildWordsForLine(text, timing.startTime, timing.endTime),
    };
  });
}

/**
 * Deterministic fallback when Grok is unreachable (or running outside
 * Vercel, e.g. plain `vite dev` with no serverless functions available):
 * distributes lines proportionally by character length across the track
 * duration, skipping detected silence gaps.
 */
export function naiveProportionalTimings(
  rawLines: string[],
  durationSeconds: number,
  silenceGaps: SilenceGap[] = [],
): LineTiming[] {
  if (rawLines.length === 0 || durationSeconds <= 0) return [];

  const sortedGaps = [...silenceGaps].sort((a, b) => a.start - b.start);
  const activeSegments: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const gap of sortedGaps) {
    if (gap.start > cursor) activeSegments.push({ start: cursor, end: gap.start });
    cursor = Math.max(cursor, gap.end);
  }
  if (cursor < durationSeconds) activeSegments.push({ start: cursor, end: durationSeconds });

  const totalActive = activeSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const usableDuration = totalActive > 0 ? totalActive : durationSeconds;
  const weights = rawLines.map((l) => Math.max(1, l.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Walk a cursor through the active (non-silent) segments only. If a
  // line's share doesn't fully fit in the remaining room of the current
  // segment, the whole line moves to the start of the next segment rather
  // than being split across the gap — otherwise its reported [start, end]
  // range would visually straddle the gap even though no time was actually
  // "spent" inside it.
  const segments = activeSegments.length > 0 ? activeSegments : [{ start: 0, end: durationSeconds }];
  let segIdx = 0;
  let segCursor = segments[0].start;
  const EPS = 1e-9;

  const timings: LineTiming[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const share = (weights[i] / totalWeight) * usableDuration;

    while (segIdx < segments.length && segCursor + share > segments[segIdx].end + EPS) {
      segIdx += 1;
      if (segIdx < segments.length) segCursor = segments[segIdx].start;
    }
    const activeSegIdx = Math.min(segIdx, segments.length - 1);
    if (segIdx >= segments.length) {
      segCursor = Math.min(segCursor, segments[activeSegIdx].end);
    }

    const start = segCursor;
    const end = Math.min(start + share, segments[activeSegIdx].end);
    const flooredEnd = Math.min(Math.max(end, start + 0.2), durationSeconds);

    timings.push({
      lineIndex: i,
      startTime: Math.min(start, durationSeconds),
      endTime: flooredEnd,
    });
    segCursor = end;
  }

  return timings;
}
