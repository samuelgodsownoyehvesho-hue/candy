export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '').trim();
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const bigint = parseInt(expanded, 16) || 0;
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function rgbToCss({ r, g, b }: RgbColor): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Linear-interpolate between two hex colors, t clamped to [0, 1]. */
export function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const clampedT = Math.max(0, Math.min(1, t));
  return rgbToCss({
    r: Math.round(ca.r + (cb.r - ca.r) * clampedT),
    g: Math.round(ca.g + (cb.g - ca.g) * clampedT),
    b: Math.round(ca.b + (cb.b - ca.b) * clampedT),
  });
}
