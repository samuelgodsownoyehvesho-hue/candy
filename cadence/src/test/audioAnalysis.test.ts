import { describe, it, expect } from 'vitest';
import { computeEnergyEnvelope, detectSilenceGaps } from '@/lib/audioAnalysis';

function makeToneWithGap(sampleRate: number, totalSeconds: number, gapStart: number, gapEnd: number): Float32Array {
  const length = Math.round(sampleRate * totalSeconds);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const inGap = t >= gapStart && t < gapEnd;
    data[i] = inGap ? 0 : Math.sin(2 * Math.PI * 220 * t) * 0.8;
  }
  return data;
}

describe('computeEnergyEnvelope', () => {
  it('produces one window per windowSeconds slice of the signal', () => {
    const sampleRate = 8000;
    const data = makeToneWithGap(sampleRate, 4, 10, 10); // no gap
    const envelope = computeEnergyEnvelope(data, sampleRate, 0.5);
    expect(envelope.levels.length).toBe(8); // 4s / 0.5s
  });

  it('normalizes levels so the loudest window is 1', () => {
    const sampleRate = 8000;
    const data = makeToneWithGap(sampleRate, 2, 10, 10);
    const envelope = computeEnergyEnvelope(data, sampleRate, 0.25);
    expect(Math.max(...envelope.levels)).toBeCloseTo(1, 5);
  });

  it('returns near-zero levels for silence', () => {
    const sampleRate = 8000;
    const silentData = new Float32Array(sampleRate * 2);
    const envelope = computeEnergyEnvelope(silentData, sampleRate, 0.5);
    expect(envelope.levels.every((v) => v === 0)).toBe(true);
  });
});

describe('detectSilenceGaps', () => {
  it('detects a sustained quiet stretch in the middle of a signal', () => {
    const sampleRate = 8000;
    // 6s total: loud 0-2s, silent 2-4s, loud 4-6s
    const data = makeToneWithGap(sampleRate, 6, 2, 4);
    const envelope = computeEnergyEnvelope(data, sampleRate, 0.25);
    const gaps = detectSilenceGaps(envelope, 0.12, 1.0);

    expect(gaps.length).toBeGreaterThanOrEqual(1);
    const gap = gaps[0];
    expect(gap.start).toBeGreaterThanOrEqual(1.5);
    expect(gap.start).toBeLessThanOrEqual(2.5);
    expect(gap.end).toBeGreaterThanOrEqual(3.5);
    expect(gap.end).toBeLessThanOrEqual(4.5);
  });

  it('ignores brief dips shorter than minGapSeconds', () => {
    const sampleRate = 8000;
    // Only a 0.3s dip — shorter than the 1.5s minimum gap
    const data = makeToneWithGap(sampleRate, 4, 2, 2.3);
    const envelope = computeEnergyEnvelope(data, sampleRate, 0.25);
    const gaps = detectSilenceGaps(envelope, 0.12, 1.5);
    expect(gaps.length).toBe(0);
  });

  it('returns no gaps for a signal with no silence', () => {
    const sampleRate = 8000;
    const data = makeToneWithGap(sampleRate, 3, 10, 10);
    const envelope = computeEnergyEnvelope(data, sampleRate, 0.25);
    expect(detectSilenceGaps(envelope)).toEqual([]);
  });
});
