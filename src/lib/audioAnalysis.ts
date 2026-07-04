import type { SilenceGap } from '@/types/lyrics';

export interface EnergyEnvelope {
  /** RMS energy per window, normalized to [0, 1] against the track's own peak */
  levels: number[];
  windowSeconds: number;
}

/**
 * Computes an RMS energy envelope over fixed-size windows. Takes a raw
 * channel (Float32Array) + sample rate directly, rather than an AudioBuffer,
 * so this stays a pure function that's easy to unit test with synthetic
 * signals — the caller passes `audioBuffer.getChannelData(0)`.
 */
export function computeEnergyEnvelope(
  channelData: Float32Array,
  sampleRate: number,
  windowSeconds = 0.25,
): EnergyEnvelope {
  const windowSize = Math.max(1, Math.round(sampleRate * windowSeconds));
  const windowCount = Math.max(1, Math.ceil(channelData.length / windowSize));
  const rawLevels = new Array<number>(windowCount).fill(0);

  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, channelData.length);
    let sumSquares = 0;
    for (let i = start; i < end; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const count = Math.max(1, end - start);
    rawLevels[w] = Math.sqrt(sumSquares / count);
  }

  const peak = Math.max(...rawLevels, 1e-9);
  const levels = rawLevels.map((v) => v / peak);

  return { levels, windowSeconds };
}

/**
 * Finds sustained low-energy stretches (intros, instrumental breaks,
 * outros) so lyric lines can be steered away from them.
 */
export function detectSilenceGaps(
  envelope: EnergyEnvelope,
  thresholdRatio = 0.12,
  minGapSeconds = 1.5,
): SilenceGap[] {
  const { levels, windowSeconds } = envelope;
  const gaps: SilenceGap[] = [];
  const minWindows = Math.max(1, Math.round(minGapSeconds / windowSeconds));

  let runStart: number | null = null;
  for (let i = 0; i < levels.length; i++) {
    const isQuiet = levels[i] < thresholdRatio;
    if (isQuiet && runStart === null) {
      runStart = i;
    } else if (!isQuiet && runStart !== null) {
      if (i - runStart >= minWindows) {
        gaps.push({ start: runStart * windowSeconds, end: i * windowSeconds });
      }
      runStart = null;
    }
  }
  if (runStart !== null && levels.length - runStart >= minWindows) {
    gaps.push({ start: runStart * windowSeconds, end: levels.length * windowSeconds });
  }

  return gaps;
}
