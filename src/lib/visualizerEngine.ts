import { lerpColor } from '@/lib/color';
import type { VisualizerConfig, VisualizerType } from '@/types/visualizer';

export interface AudioFrameData {
  /** 0-255 magnitude per frequency bin */
  freq: Uint8Array;
  /** 0-255, 128 = zero crossing */
  timeDomain: Uint8Array;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

export interface RenderState {
  particles: Particle[] | null;
  lastParticleCount: number;
}

export function createRenderState(): RenderState {
  return { particles: null, lastParticleCount: 0 };
}

function spawnParticle(width: number, height: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.3 + Math.random() * 0.6;
  return {
    x: width / 2,
    y: height / 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0,
    maxLife: 120 + Math.random() * 180,
    trail: [],
  };
}

function ensureParticles(state: RenderState, count: number, width: number, height: number) {
  if (!state.particles || state.lastParticleCount !== count) {
    state.particles = Array.from({ length: count }, () => spawnParticle(width, height));
    state.lastParticleCount = count;
  }
}

function colorFor(config: VisualizerConfig, t: number): string {
  if (!config.useGradient) return config.colorPrimary;
  return lerpColor(config.colorPrimary, config.colorSecondary, t);
}

function averageLevel(freq: Uint8Array, sensitivity: number): number {
  if (freq.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < freq.length; i++) sum += freq[i];
  return Math.min(1, (sum / freq.length / 255) * sensitivity);
}

function applyGlow(ctx: CanvasRenderingContext2D, config: VisualizerConfig, color: string) {
  if (config.glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = (config.glow / 100) * 24;
  } else {
    ctx.shadowBlur = 0;
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: AudioFrameData,
  config: VisualizerConfig,
) {
  const { timeDomain } = data;
  ctx.save();
  ctx.globalAlpha = config.opacity;
  ctx.lineWidth = config.thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyGlow(ctx, config, config.colorPrimary);

  const step = width / (timeDomain.length - 1 || 1);
  ctx.beginPath();
  for (let i = 0; i < timeDomain.length; i++) {
    const norm = (timeDomain[i] - 128) / 128;
    const amplified = Math.max(-1, Math.min(1, norm * config.sensitivity));
    const x = i * step;
    const y = height / 2 + amplified * (height / 2) * 0.85;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, config.colorPrimary);
  grad.addColorStop(1, config.useGradient ? config.colorSecondary : config.colorPrimary);
  ctx.strokeStyle = grad;
  ctx.stroke();
  ctx.restore();
}

function drawSpectrumBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: AudioFrameData,
  config: VisualizerConfig,
) {
  const { freq } = data;
  const barCount = Math.max(8, Math.floor(width / (config.thickness + 4)));
  ctx.save();
  ctx.globalAlpha = config.opacity;
  applyGlow(ctx, config, config.colorPrimary);

  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * freq.length);
    const level = Math.min(1, (freq[dataIndex] / 255) * config.sensitivity);
    const barHeight = Math.max(2, level * height);
    const x = i * (width / barCount);
    const y = height - barHeight;
    ctx.fillStyle = colorFor(config, i / barCount);
    ctx.fillRect(x, y, Math.max(1, width / barCount - 2), barHeight);
  }
  ctx.restore();
}

function drawCircularSpectrum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: AudioFrameData,
  config: VisualizerConfig,
  time: number,
) {
  const { freq } = data;
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = (config.radius * Math.min(width, height)) / 300;
  const bars = 64;
  const rotation = (config.rotation * Math.PI) / 180 + (time * config.rotationSpeed * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = config.opacity;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  applyGlow(ctx, config, config.colorPrimary);
  ctx.lineWidth = config.thickness;
  ctx.lineCap = 'round';

  for (let i = 0; i < bars; i++) {
    const angle = (i / bars) * Math.PI * 2;
    const dataIndex = Math.floor((i / bars) * freq.length);
    const level = Math.min(1, (freq[dataIndex] / 255) * config.sensitivity);
    const barLength = 6 + level * baseRadius * 0.8;
    const x1 = Math.cos(angle) * baseRadius;
    const y1 = Math.sin(angle) * baseRadius;
    const x2 = Math.cos(angle) * (baseRadius + barLength);
    const y2 = Math.sin(angle) * (baseRadius + barLength);
    ctx.strokeStyle = colorFor(config, i / bars);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: AudioFrameData,
  config: VisualizerConfig,
  state: RenderState,
) {
  ensureParticles(state, Math.round(config.particleCount), width, height);
  const level = averageLevel(data.freq, config.sensitivity);
  const maxTrail = Math.max(1, Math.round((config.trailLength / 100) * 24));

  ctx.save();
  applyGlow(ctx, config, config.colorPrimary);

  for (const p of state.particles ?? []) {
    const outwardBoost = 1 + level * 3;
    p.life += 1 * config.speed;
    p.x += p.vx * outwardBoost * config.speed;
    p.y += p.vy * outwardBoost * config.speed;

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > maxTrail) p.trail.shift();

    if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
      Object.assign(p, spawnParticle(width, height));
    }

    const t = p.life / p.maxLife;
    for (let i = 0; i < p.trail.length; i++) {
      const pt = p.trail[i];
      ctx.globalAlpha = config.opacity * (i / p.trail.length) * 0.5;
      ctx.fillStyle = colorFor(config, t);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(1, config.thickness * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = config.opacity;
    ctx.fillStyle = colorFor(config, t);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.5, config.thickness), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawVisualizerCore(
  type: VisualizerType,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: AudioFrameData,
  config: VisualizerConfig,
  time: number,
  state: RenderState,
): void {
  switch (type) {
    case 'waveform':
      drawWaveform(ctx, width, height, data, config);
      break;
    case 'spectrum-bars':
      drawSpectrumBars(ctx, width, height, data, config);
      break;
    case 'circular-spectrum':
      drawCircularSpectrum(ctx, width, height, data, config, time);
      break;
    case 'particle':
      drawParticles(ctx, width, height, data, config, state);
      break;
    default:
      break;
  }
}
