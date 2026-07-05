import { describe, it, expect } from 'vitest';
import { buildWordsForLine, groupWordsIntoLines } from '@/lib/lyrics';

describe('buildWordsForLine', () => {
  it('distributes time across words proportional to word length', () => {
    const words = buildWordsForLine('a extraordinary', 0, 10);
    expect(words).toHaveLength(2);
    expect(words[0].text).toBe('a');
    expect(words[1].text).toBe('extraordinary');
    const aDuration = words[0].endTime - words[0].startTime;
    const bigDuration = words[1].endTime - words[1].startTime;
    expect(bigDuration).toBeGreaterThan(aDuration * 5);
  });

  it('keeps words in order with no gaps or overlaps', () => {
    const words = buildWordsForLine('one two three four', 5, 9);
    for (let i = 1; i < words.length; i++) {
      expect(words[i].startTime).toBeCloseTo(words[i - 1].endTime, 5);
    }
    expect(words[0].startTime).toBe(5);
    expect(words[words.length - 1].endTime).toBe(9);
  });

  it('returns an empty array for a blank line', () => {
    expect(buildWordsForLine('   ', 0, 5)).toEqual([]);
  });
});

describe('groupWordsIntoLines', () => {
  it('assigns each word to the segment whose time range contains it', () => {
    const segments = [
      { start: 0, end: 2, text: 'hello world' },
      { start: 2, end: 4, text: 'goodbye now' },
    ];
    const words = [
      { word: 'hello', start: 0.1, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.2 },
      { word: 'goodbye', start: 2.1, end: 2.6 },
      { word: 'now', start: 2.7, end: 3.0 },
    ];

    const lines = groupWordsIntoLines(segments, words);
    expect(lines).toHaveLength(2);
    expect(lines[0].words.map((w) => w.text)).toEqual(['hello', 'world']);
    expect(lines[1].words.map((w) => w.text)).toEqual(['goodbye', 'now']);
  });

  it('falls back to even word distribution when no words fall in a segment', () => {
    const segments = [{ start: 0, end: 3, text: 'a line with no matching words' }];
    const lines = groupWordsIntoLines(segments, []);
    expect(lines).toHaveLength(1);
    expect(lines[0].words.length).toBeGreaterThan(0);
  });

  it('preserves segment text and timing on the resulting line', () => {
    const segments = [{ start: 1.5, end: 3.5, text: '  padded text  ' }];
    const lines = groupWordsIntoLines(segments, []);
    expect(lines[0].text).toBe('padded text');
    expect(lines[0].startTime).toBe(1.5);
    expect(lines[0].endTime).toBe(3.5);
  });
});
