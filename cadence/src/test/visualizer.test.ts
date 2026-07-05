import { describe, it, expect } from 'vitest';
import { createDefaultVisualizerConfig, VISUALIZER_LIBRARY } from '@/types/visualizer';

describe('visualizer defaults', () => {
  it('lists exactly the 4 implemented visualizer types', () => {
    expect(VISUALIZER_LIBRARY.map((v) => v.type).sort()).toEqual(
      ['circular-spectrum', 'particle', 'spectrum-bars', 'waveform'].sort(),
    );
  });

  it('produces a valid, in-range config for every library entry', () => {
    for (const entry of VISUALIZER_LIBRARY) {
      const config = createDefaultVisualizerConfig(entry.type);
      expect(config.sensitivity).toBeGreaterThan(0);
      expect(config.opacity).toBeGreaterThan(0);
      expect(config.opacity).toBeLessThanOrEqual(1);
      expect(config.particleCount).toBeGreaterThan(0);
      expect(config.colorPrimary).toMatch(/^#/);
      expect(config.colorSecondary).toMatch(/^#/);
    }
  });

  it('tunes particle count higher for the particle type than for waveform', () => {
    const particleConfig = createDefaultVisualizerConfig('particle');
    const waveformConfig = createDefaultVisualizerConfig('waveform');
    expect(particleConfig.particleCount).toBeGreaterThan(waveformConfig.particleCount);
  });

  it('gives circular-spectrum a non-zero auto-rotation by default', () => {
    expect(createDefaultVisualizerConfig('circular-spectrum').rotationSpeed).toBeGreaterThan(0);
  });
});
