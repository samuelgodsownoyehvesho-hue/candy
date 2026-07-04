import { describe, it, expect } from 'vitest';
import { hexToRgb, lerpColor, rgbToCss } from '@/lib/color';

describe('color utils', () => {
  it('parses a 6-digit hex color', () => {
    expect(hexToRgb('#3FE8C9')).toEqual({ r: 63, g: 232, b: 201 });
  });

  it('parses a 3-digit shorthand hex color', () => {
    expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('formats an rgb object as a CSS string', () => {
    expect(rgbToCss({ r: 10, g: 20, b: 30 })).toBe('rgb(10, 20, 30)');
  });

  it('lerps to the start color at t=0 and end color at t=1', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('rgb(0, 0, 0)');
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('rgb(255, 255, 255)');
  });

  it('clamps t outside of [0,1]', () => {
    expect(lerpColor('#000000', '#ffffff', -5)).toBe('rgb(0, 0, 0)');
    expect(lerpColor('#000000', '#ffffff', 5)).toBe('rgb(255, 255, 255)');
  });

  it('produces a midpoint color at t=0.5', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)');
  });
});
