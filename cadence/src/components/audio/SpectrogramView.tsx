import { useEffect, useRef, useState } from 'react';
import type { SpectrogramWorkerOutput } from '@/workers/spectrogram.worker';

interface SpectrogramViewProps {
  audioBuffer: AudioBuffer | null;
  isDecoding: boolean;
}

const TARGET_FRAMES = 700;
const FFT_SIZE = 2048;

/** Amber -> teal duotone intensity ramp matching the design system. */
function intensityToRgb(t: number): [number, number, number] {
  // t in [0,1]. Low energy -> near-black, mid -> amber, high -> teal-white.
  const stops: [number, number, number, number][] = [
    [0, 12, 14, 17],
    [0.35, 199, 126, 31],
    [0.7, 232, 163, 61],
    [1, 143, 242, 220],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i];
    const [t1, r1, g1, b1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const localT = (t - t0) / (t1 - t0 || 1);
      return [
        Math.round(r0 + (r1 - r0) * localT),
        Math.round(g0 + (g1 - g0) * localT),
        Math.round(b0 + (b1 - b0) * localT),
      ];
    }
  }
  return [143, 242, 220];
}

export function SpectrogramView({ audioBuffer, isDecoding }: SpectrogramViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!audioBuffer) return;

    setIsComputing(true);
    setComputeError(null);

    const worker = new Worker(new URL('../../workers/spectrogram.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const rawChannel = audioBuffer.getChannelData(0);
    // Clone before transferring — transferring detaches the backing buffer,
    // and we don't own audioBuffer's internal storage.
    const channelData = new Float32Array(rawChannel);

    const totalSamples = channelData.length;
    const hopSize = Math.max(256, Math.floor(totalSamples / TARGET_FRAMES));

    worker.onmessage = (event: MessageEvent<SpectrogramWorkerOutput>) => {
      const { frames, bins, pixels } = event.data;

      let bufferCanvas = bufferCanvasRef.current;
      if (!bufferCanvas) {
        bufferCanvas = document.createElement('canvas');
        bufferCanvasRef.current = bufferCanvas;
      }
      bufferCanvas.width = frames;
      bufferCanvas.height = bins;
      const bctx = bufferCanvas.getContext('2d');
      if (bctx) {
        const imageData = bctx.createImageData(frames, bins);
        for (let f = 0; f < frames; f++) {
          for (let b = 0; b < bins; b++) {
            const intensity = pixels[f * bins + b] / 255;
            const [r, g, bl] = intensityToRgb(intensity);
            // Flip vertically: bin 0 (low freq) should render at the bottom.
            const destRow = bins - 1 - b;
            const idx = (destRow * frames + f) * 4;
            imageData.data[idx] = r;
            imageData.data[idx + 1] = g;
            imageData.data[idx + 2] = bl;
            imageData.data[idx + 3] = 255;
          }
        }
        bctx.putImageData(imageData, 0, 0);
      }

      const displayCanvas = canvasRef.current;
      if (displayCanvas && bufferCanvas) {
        const dctx = displayCanvas.getContext('2d');
        const rect = displayCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        displayCanvas.width = rect.width * dpr;
        displayCanvas.height = rect.height * dpr;
        if (dctx) {
          dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          dctx.imageSmoothingEnabled = true;
          dctx.drawImage(bufferCanvas, 0, 0, frames, bins, 0, 0, rect.width, rect.height);
        }
      }

      setIsComputing(false);
      worker.terminate();
    };

    worker.onerror = () => {
      setComputeError('Could not compute the spectrogram for this track.');
      setIsComputing(false);
      worker.terminate();
    };

    worker.postMessage(
      { channelData, sampleRate: audioBuffer.sampleRate, fftSize: FFT_SIZE, hopSize },
      [channelData.buffer],
    );

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [audioBuffer]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block rounded-lg" />
      {(isDecoding || isComputing) && !computeError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-ink-dim text-xs readout">
            <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
            {isDecoding ? 'DECODING AUDIO' : 'COMPUTING SPECTROGRAM'}
          </div>
        </div>
      )}
      {computeError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-clip-soft">{computeError}</p>
        </div>
      )}
    </div>
  );
}
