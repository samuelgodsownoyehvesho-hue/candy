/// <reference lib="webworker" />
import { fft, hannWindow } from '../lib/fft';

export interface SpectrogramWorkerInput {
  channelData: Float32Array;
  sampleRate: number;
  fftSize: number;
  hopSize: number;
}

export interface SpectrogramWorkerOutput {
  frames: number;
  bins: number;
  sampleRate: number;
  hopSize: number;
  fftSize: number;
  /** frames x bins, row-major, 0-255 normalized magnitude in dB */
  pixels: Uint8ClampedArray;
}

const ctx = self as unknown as {
  onmessage: ((ev: MessageEvent<SpectrogramWorkerInput>) => void) | null;
  postMessage: (message: SpectrogramWorkerOutput, transfer?: Transferable[]) => void;
};

ctx.onmessage = (event) => {
  const { channelData, sampleRate, fftSize, hopSize } = event.data;

  const totalSamples = channelData.length;
  const frames = Math.max(1, Math.floor((totalSamples - fftSize) / hopSize) + 1);
  const bins = fftSize / 2;

  const window = hannWindow(fftSize);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const dbMatrix = new Float32Array(frames * bins);

  let minDb = Infinity;
  let maxDb = -Infinity;

  for (let f = 0; f < frames; f++) {
    const offset = f * hopSize;
    for (let i = 0; i < fftSize; i++) {
      const sample = offset + i < totalSamples ? channelData[offset + i] : 0;
      real[i] = sample * window[i];
      imag[i] = 0;
    }
    fft(real, imag);
    for (let b = 0; b < bins; b++) {
      const mag = Math.sqrt(real[b] * real[b] + imag[b] * imag[b]);
      const db = 20 * Math.log10(mag + 1e-9);
      dbMatrix[f * bins + b] = db;
      if (db < minDb) minDb = db;
      if (db > maxDb) maxDb = db;
    }
  }

  const range = Math.max(1, maxDb - minDb);
  const pixels = new Uint8ClampedArray(frames * bins);
  for (let i = 0; i < dbMatrix.length; i++) {
    const norm = (dbMatrix[i] - minDb) / range;
    pixels[i] = Math.round(Math.min(1, Math.max(0, norm)) * 255);
  }

  ctx.postMessage(
    { frames, bins, sampleRate, hopSize, fftSize, pixels },
    [pixels.buffer],
  );
};
