import { useEffect, useRef } from 'react';
import type { VisualizerConfig, VisualizerType } from '@/types/visualizer';
import { createRenderState, drawVisualizerCore, type AudioFrameData } from '@/lib/visualizerEngine';

interface VisualizerCanvasProps {
  type: VisualizerType;
  config: VisualizerConfig;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  className?: string;
}

/**
 * Shared rendering host for every visualizer type. The per-type shape logic
 * lives in `lib/visualizerEngine.ts`; everything here — glow via shadow,
 * whole-canvas blur, motion-blur trails, bloom, reflection, refraction, and
 * drop shadow — is a generic post-processing pass applied identically
 * regardless of which visualizer is selected. This is the pattern the
 * remaining visualizer types will plug into.
 */
export function VisualizerCanvas({ type, config, analyserNode, isPlaying, className }: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef(createRenderState());
  const clockRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Live refs so the single long-lived rAF loop always reads current props
  // without needing to be torn down and restarted on every config tweak.
  const configRef = useRef(config);
  const typeRef = useRef(type);
  const analyserRef = useRef(analyserNode);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    typeRef.current = type;
  }, [type]);
  useEffect(() => {
    analyserRef.current = analyserNode;
  }, [analyserNode]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxMaybeNull = canvas.getContext('2d');
    if (!ctxMaybeNull) return;
    const ctx: CanvasRenderingContext2D = ctxMaybeNull;

    if (!bufferRef.current) bufferRef.current = document.createElement('canvas');
    const buffer = bufferRef.current;
    const bctxMaybeNull = buffer.getContext('2d');
    if (!bctxMaybeNull) return;
    const bctx: CanvasRenderingContext2D = bctxMaybeNull;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      buffer.width = width * dpr;
      buffer.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function getFrameData(): AudioFrameData {
      const analyser = analyserRef.current;
      if (analyser && isPlayingRef.current) {
        const fb = new Uint8Array(analyser.frequencyBinCount);
        const tb = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fb);
        analyser.getByteTimeDomainData(tb);
        return { freq: fb, timeDomain: tb };
      }
      // Idle synthetic data — gentle sine-based motion so the preview isn't
      // a dead frozen frame while paused or before a track is loaded.
      const n = 64;
      const freq = new Uint8Array(n);
      const timeDomain = new Uint8Array(n);
      const t = clockRef.current;
      for (let i = 0; i < n; i++) {
        freq[i] = Math.round(30 + 20 * Math.abs(Math.sin(t * 0.6 + i * 0.3)));
        timeDomain[i] = Math.round(128 + 14 * Math.sin(t * 1.2 + i * 0.5));
      }
      return { freq, timeDomain };
    }

    function frame(now: number) {
      const dt = lastTimeRef.current ? Math.min(0.05, (now - lastTimeRef.current) / 1000) : 0.016;
      lastTimeRef.current = now;
      const cfg = configRef.current;

      if (!reducedMotion || (analyserRef.current && isPlayingRef.current)) {
        clockRef.current += dt * cfg.speed;
      }

      const data = getFrameData();

      // 1. Persistent trail fade on the visible canvas — never fully
      // cleared, so previous frames decay into a motion trail instead of
      // vanishing instantly.
      const fadeAlpha = 1 - Math.min(0.95, (cfg.motionBlur / 100) * 0.9 + 0.08);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 2. Draw fresh shapes into the offscreen buffer.
      bctx.clearRect(0, 0, width, height);
      drawVisualizerCore(typeRef.current, bctx, width, height, data, cfg, clockRef.current, stateRef.current);

      // 3. Composite buffer -> visible canvas, with optional whole-canvas
      // blur and a banded horizontal-offset refraction distortion.
      ctx.save();
      const blurPx = (cfg.blur / 20) * 8;
      ctx.filter = blurPx > 0.1 ? `blur(${blurPx}px)` : 'none';

      const refractionAmt = (cfg.refraction / 100) * 14;
      if (refractionAmt > 0.4) {
        const bands = 24;
        const bandH = height / bands;
        for (let b = 0; b < bands; b++) {
          const offset = Math.sin(clockRef.current * 2 + b * 0.5) * refractionAmt;
          ctx.drawImage(
            buffer,
            0,
            b * bandH * dpr,
            width * dpr,
            bandH * dpr,
            offset,
            b * bandH,
            width,
            bandH,
          );
        }
      } else {
        ctx.drawImage(buffer, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
      }
      ctx.restore();

      // 4. Bloom — additive blurred overlay of the same content.
      if (cfg.bloom > 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.6, cfg.bloom / 100);
        ctx.filter = `blur(${(cfg.bloom / 100) * 16}px)`;
        ctx.drawImage(buffer, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
        ctx.restore();
      }

      // 5. Reflection — flipped, faded copy beneath the main content.
      if (cfg.reflection > 2) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, cfg.reflection / 100);
        ctx.translate(0, height * 2);
        ctx.scale(1, -1);
        ctx.drawImage(buffer, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
        ctx.restore();
      }

      // 6. Drop shadow — whole-canvas shadow behind the content, distinct
      // from the per-shape glow applied inside the core drawers.
      if (cfg.shadow) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.shadowColor = cfg.shadowColor;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        ctx.drawImage(buffer, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
    // Intentionally empty: the loop reads live values via refs above, so it
    // never needs to restart when config/type/analyser/isPlaying change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={`${type} audio visualizer`}
    />
  );
}
