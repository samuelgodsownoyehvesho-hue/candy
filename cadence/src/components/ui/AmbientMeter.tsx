import { useEffect, useRef } from 'react';

interface AmbientMeterProps {
  /** number of vertical bars */
  bars?: number;
  className?: string;
  /** overall animation energy, 0-1 */
  energy?: number;
  colorA?: string;
  colorB?: string;
}

/**
 * The signature visual motif for Cadence: an idle, audio-reactive-looking
 * VU meter rendered on canvas. It is not random noise — each bar follows its
 * own sine phase with slight per-bar jitter so it reads as a believable
 * signal chain rather than decoration. Used on the splash screen, landing
 * hero, and as an ambient background accent on the dashboard.
 */
export function AmbientMeter({
  bars = 48,
  className,
  energy = 0.7,
  colorA = '#E8A33D',
  colorB = '#3FE8C9',
}: AmbientMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const phases = Array.from({ length: bars }, () => Math.random() * Math.PI * 2);
    const speeds = Array.from({ length: bars }, () => 0.6 + Math.random() * 0.9);
    let frame = 0;
    let lastDraw = 0;

    function draw(t: number) {
      if (!ctx) return;
      // throttle to ~30fps for the ambient effect; cheap and battery-friendly
      if (t - lastDraw < 33) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastDraw = t;
      ctx.clearRect(0, 0, width, height);

      const gap = 4;
      const barWidth = Math.max(2, width / bars - gap);
      const time = reducedMotion.current ? 0 : frame * 0.045;
      frame += 1;

      for (let i = 0; i < bars; i++) {
        const phase = phases[i];
        const speed = speeds[i];
        const wave = Math.sin(time * speed + phase) * 0.5 + 0.5;
        const envelope = 0.18 + wave * energy;
        const barHeight = Math.max(3, envelope * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        const mix = i / bars;
        gradient.addColorStop(0, mix > 0.5 ? colorB : colorA);
        gradient.addColorStop(1, 'rgba(255,255,255,0.05)');

        ctx.fillStyle = gradient;
        const radius = Math.min(2, barWidth / 2);
        roundedRect(ctx, x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    function roundedRect(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) {
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + w, y, x + w, y + h, r);
      context.arcTo(x + w, y + h, x, y + h, r);
      context.arcTo(x, y + h, x, y, r);
      context.arcTo(x, y, x + w, y, r);
      context.closePath();
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [bars, energy, colorA, colorB]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="presentation"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
