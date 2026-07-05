import { describe, it, expect, beforeEach } from 'vitest';
import { loadJSON, saveJSON, removeKey, isStorageAvailable } from '@/lib/storage';

describe('storage helper', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reports storage as available in jsdom', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('returns the fallback when nothing is stored', () => {
    expect(loadJSON('missing-key', { a: 1 })).toEqual({ a: 1 });
  });

  it('round-trips a JSON value through save and load', () => {
    const value = { title: 'Midnight Drive', bpm: 128, tags: ['afrobeats', 'pop'] };
    expect(saveJSON('demo', value)).toBe(true);
    expect(loadJSON('demo', null)).toEqual(value);
  });

  it('falls back gracefully on corrupted JSON', () => {
    window.localStorage.setItem('cadence:corrupt', '{not valid json');
    expect(loadJSON('corrupt', 'fallback')).toBe('fallback');
  });

  it('removes a stored key', () => {
    saveJSON('temp', 42);
    removeKey('temp');
    expect(loadJSON('temp', null)).toBeNull();
  });
});
