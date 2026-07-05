import { describe, it, expect } from 'vitest';
import { fft, hannWindow, isPowerOfTwo } from '@/lib/fft';

describe('fft', () => {
  it('correctly identifies power-of-two lengths', () => {
    expect(isPowerOfTwo(1024)).toBe(true);
    expect(isPowerOfTwo(2048)).toBe(true);
    expect(isPowerOfTwo(1000)).toBe(false);
    expect(isPowerOfTwo(0)).toBe(false);
  });

  it('produces a Hann window that tapers to (near) zero at both edges', () => {
    const w = hannWindow(64);
    expect(w[0]).toBeCloseTo(0, 5);
    expect(w[w.length - 1]).toBeCloseTo(0, 5);
    // peak should be near the center
    const mid = w[Math.floor(w.length / 2)];
    expect(mid).toBeGreaterThan(0.9);
  });

  it('places the dominant energy of a pure sine wave at the correct bin', () => {
    const N = 1024;
    const sampleRate = 8192;
    const targetFreq = 512; // Hz — should land near bin (targetFreq / sampleRate) * N
    const real = new Float32Array(N);
    const imag = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      real[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
    }

    fft(real, imag);

    const magnitudes = new Float32Array(N / 2);
    for (let b = 0; b < N / 2; b++) {
      magnitudes[b] = Math.sqrt(real[b] ** 2 + imag[b] ** 2);
    }

    let peakBin = 0;
    let peakVal = -Infinity;
    for (let b = 0; b < magnitudes.length; b++) {
      if (magnitudes[b] > peakVal) {
        peakVal = magnitudes[b];
        peakBin = b;
      }
    }

    const expectedBin = Math.round((targetFreq / sampleRate) * N);
    expect(peakBin).toBeGreaterThanOrEqual(expectedBin - 1);
    expect(peakBin).toBeLessThanOrEqual(expectedBin + 1);
  });

  it('leaves an all-zero signal as all zero', () => {
    const real = new Float32Array(64);
    const imag = new Float32Array(64);
    fft(real, imag);
    expect(real.every((v) => v === 0)).toBe(true);
    expect(imag.every((v) => v === 0)).toBe(true);
  });
});
