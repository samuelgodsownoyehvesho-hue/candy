import { nanoid } from 'nanoid';
import type { LyricLine, LyricWord } from '@/types/lyrics';

/**
 * Splits a line's time range across its words, weighted by word character
 * length. Used whenever a line's text is manually edited (so the word
 * breakdown stays in sync with new text) or when a manually-added line
 * needs an initial word breakdown. This is NOT used to guess timing from
 * scratch anymore — real timing comes from Groq Whisper's transcription.
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

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

/**
 * Groups Whisper's flat top-level `words` array under the segment (line)
 * whose time range each word falls into. Pure and unit-tested here; the
 * Vercel serverless function (`api/whisper-transcribe.js`) intentionally
 * re-implements this same small logic inline in plain JS rather than
 * importing across the api/src boundary, to keep the zero-config Vercel
 * function bundle self-contained and avoid any cross-directory TS
 * resolution uncertainty in Vercel's build pipeline.
 */
export function groupWordsIntoLines(segments: WhisperSegment[], words: WhisperWord[]): LyricLine[] {
  return segments.map((seg) => {
    const segWords = words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end + 0.05);
    const lineWords: LyricWord[] =
      segWords.length > 0
        ? segWords.map((w) => ({
            id: nanoid(6),
            text: w.word.trim(),
            startTime: Math.max(seg.start, w.start),
            endTime: Math.min(seg.end, Math.max(w.end, w.start + 0.05)),
          }))
        : buildWordsForLine(seg.text.trim(), seg.start, seg.end);

    return {
      id: nanoid(8),
      text: seg.text.trim(),
      startTime: seg.start,
      endTime: seg.end,
      words: lineWords,
    };
  });
}
