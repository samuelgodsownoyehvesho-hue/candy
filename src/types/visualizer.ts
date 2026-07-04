/**
 * Visualizer type system. Slice 3 ships 4 real, working renderers; the
 * remaining 26 from the full spec follow the exact same pattern established
 * here — a VisualizerType, a tuned default VisualizerConfig, and a draw
 * function in `lib/visualizerEngine.ts` — so VISUALIZER_LIBRARY only lists
 * types that actually render (no disabled "coming soon" tiles).
 */

export type VisualizerType = 'waveform' | 'spectrum-bars' | 'circular-spectrum' | 'particle';

export interface VisualizerConfig {
  colorPrimary: string;
  colorSecondary: string;
  useGradient: boolean;
  glow: number; // 0-100
  blur: number; // 0-20 px
  thickness: number; // 1-20 px
  sensitivity: number; // 0.2-3
  radius: number; // 20-300 px, used by circular/particle layouts
  rotation: number; // 0-360 deg static offset
  rotationSpeed: number; // deg/sec auto-rotate, 0 = static
  speed: number; // animation speed multiplier, 0.1-3
  opacity: number; // 0-1
  shadow: boolean;
  shadowColor: string;
  motionBlur: number; // 0-100, trail smear intensity
  bloom: number; // 0-100
  reflection: number; // 0-100
  refraction: number; // 0-100
  particleCount: number; // 20-500, used by the particle type
  trailLength: number; // 0-100
}

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  colorPrimary: '#3FE8C9',
  colorSecondary: '#E8A33D',
  useGradient: true,
  glow: 40,
  blur: 0,
  thickness: 3,
  sensitivity: 1,
  radius: 120,
  rotation: 0,
  rotationSpeed: 0,
  speed: 1,
  opacity: 1,
  shadow: false,
  shadowColor: '#000000',
  motionBlur: 25,
  bloom: 20,
  reflection: 0,
  refraction: 0,
  particleCount: 120,
  trailLength: 30,
};

export interface VisualizerLibraryEntry {
  type: VisualizerType;
  label: string;
  description: string;
}

export const VISUALIZER_LIBRARY: VisualizerLibraryEntry[] = [
  {
    type: 'waveform',
    label: 'Waveform',
    description: 'Classic oscilloscope-style line tracing the raw audio signal.',
  },
  {
    type: 'spectrum-bars',
    label: 'Spectrum Bars',
    description: 'Vertical bars reacting to frequency bands, low to high.',
  },
  {
    type: 'circular-spectrum',
    label: 'Circular Spectrum',
    description: 'Frequency bars arranged in a ring around a center point.',
  },
  {
    type: 'particle',
    label: 'Particle',
    description: 'A field of particles that pulses outward and drifts with the beat.',
  },
];

/** Per-type tuned starting point so a fresh pick doesn't look identical across types. */
export function createDefaultVisualizerConfig(type: VisualizerType): VisualizerConfig {
  switch (type) {
    case 'circular-spectrum':
      return { ...DEFAULT_VISUALIZER_CONFIG, radius: 100, rotationSpeed: 6 };
    case 'particle':
      return { ...DEFAULT_VISUALIZER_CONFIG, particleCount: 140, trailLength: 45, radius: 160 };
    case 'spectrum-bars':
      return { ...DEFAULT_VISUALIZER_CONFIG, thickness: 4, motionBlur: 15 };
    case 'waveform':
    default:
      return { ...DEFAULT_VISUALIZER_CONFIG, thickness: 2.5, motionBlur: 20 };
  }
}
