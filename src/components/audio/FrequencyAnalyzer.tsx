import { useEffect, useRef } from 'react';

interface FrequencyAnalyzerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

/**
 * Renders a real-time frequency bar display from a live Web Audio
 * AnalyserNode. Bars are grouped log-scale from the raw frequency bins so
 * low end detail isn't crushed into the first two bars the way a linear
 * grouping would.
 */
export function FrequencyAnalyzer({ analyserNode, isPlaying }: FrequencyAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

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

    const barCount = 40;
    const freqData = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

    function groupLogScale(data: Uint8Array, bins: number): number[] {
      const groups: number[] = [];
      const totalBins = data.length;
      for (let i = 0; i < bins; i++) {
        const start = Math.floor((totalBins * (i / bins)) ** 1.5 / Math.pow(totalBins, 0.5));
        const end = Math.floor((totalBins * ((i + 1) / bins)) ** 1.5 / Math.pow(totalBins, 0.5));
        const lo = Math.min(start, totalBins - 1);
        const hi = Math.max(lo + 1, Math.min(end, totalBins));
        let sum = 0;
        let count = 0;
        for (let b = lo; b < hi; b++) {
          sum += data[b];
          count++;
        }
        groups.push(count > 0 ? sum / count / 255 : 0);
      }
      return groups;
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      let levels: number[];
      if (analyserNode && freqData && isPlaying) {
        analyserNode.getByteFrequencyData(freqData);
        levels = groupLogScale(freqData, barCount);
      } else {
        // Idle state: flat, faint baseline instead of dead-empty canvas
        levels = Array.from({ length: barCount }, () => 0.04);
      }

      const gap = 3;
      const barWidth = Math.max(2, width / barCount - gap);

      for (let i = 0; i < barCount; i++) {
        const level = levels[i];
        const barHeight = Math.max(2, level * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, '#3FE8C9');
        gradient.addColorStop(1, '#E8A33D');
        ctx.fillStyle = gradient;

        if (level > 0.6) {
          ctx.shadowColor = 'rgba(63,232,201,0.5)';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }

        const r = Math.min(2, barWidth / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + barHeight, r);
        ctx.arcTo(x + barWidth, y + barHeight, x, y + barHeight, r);
        ctx.arcTo(x, y + barHeight, x, y, r);
        ctx.arcTo(x, y, x + barWidth, y, r);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyserNode, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Live frequency spectrum"
      className="w-full h-full block"
    />
  );
}
