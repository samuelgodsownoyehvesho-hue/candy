import { describe, it, expect } from 'vitest';
import {
  parseRawLyrics,
  buildWordsForLine,
  buildLinesFromTimings,
  naiveProportionalTimings,
} from '@/lib/lyrics';

describe('parseRawLyrics', () => {
  it('splits on newlines and drops empty lines', () => {
    const result = parseRawLyrics('Line one\n\nLine two\n   \nLine three');
    expect(result).toEqual(['Line one', 'Line two', 'Line three']);
  });

  it('trims whitespace from each line', () => {
    expect(parseRawLyrics('  padded line  \nanother')).toEqual(['padded line', 'another']);
  });

  it('returns an empty array for blank input', () => {
    expect(parseRawLyrics('   \n\n  ')).toEqual([]);
  });
});

describe('buildWordsForLine', () => {
  it('distributes time across words proportional to word length', () => {
    const words = buildWordsForLine('a extraordinary', 0, 10);
    expect(words).toHaveLength(2);
    expect(words[0].text).toBe('a');
    expect(words[1].text).toBe('extraordinary');
    // "extraordinary" (13 chars) should get much more time than "a" (1 char)
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

describe('buildLinesFromTimings', () => {
  it('attaches the correct timing to each line by index', () => {
    const lines = buildLinesFromTimings(
      ['first line', 'second line'],
      [
        { lineIndex: 0, startTime: 0, endTime: 2 },
        { lineIndex: 1, startTime: 2, endTime: 5 },
      ],
    );
    expect(lines[0].startTime).toBe(0);
    expect(lines[0].endTime).toBe(2);
    expect(lines[1].startTime).toBe(2);
    expect(lines[1].endTime).toBe(5);
    expect(lines[0].words.length).toBeGreaterThan(0);
  });
});

describe('naiveProportionalTimings', () => {
  it('returns strictly non-decreasing, in-order timings covering the duration', () => {
    const lines = ['short', 'a much longer line here', 'mid length line'];
    const timings = naiveProportionalTimings(lines, 30, []);

    expect(timings).toHaveLength(3);
    for (let i = 0; i < timings.length; i++) {
      expect(timings[i].endTime).toBeGreaterThan(timings[i].startTime);
    }
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].startTime).toBeGreaterThanOrEqual(timings[i - 1].endTime - 0.01);
    }
    expect(timings[timings.length - 1].endTime).toBeLessThanOrEqual(30);
  });

  it('gives a longer line more allotted time than a shorter one', () => {
    const timings = naiveProportionalTimings(['hi', 'this is a considerably longer lyric line'], 20, []);
    const shortDuration = timings[0].endTime - timings[0].startTime;
    const longDuration = timings[1].endTime - timings[1].startTime;
    expect(longDuration).toBeGreaterThan(shortDuration);
  });

  it('steers line timing away from a detected silence gap', () => {
    const lines = ['line one', 'line two', 'line three'];
    const gaps = [{ start: 5, end: 10 }];
    const timings = naiveProportionalTimings(lines, 20, gaps);

    for (const t of timings) {
      const overlapsGap = t.startTime < gaps[0].end && t.endTime > gaps[0].start;
      expect(overlapsGap).toBe(false);
    }
  });

  it('returns an empty array for no lines or zero duration', () => {
    expect(naiveProportionalTimings([], 30)).toEqual([]);
    expect(naiveProportionalTimings(['a line'], 0)).toEqual([]);
  });
});
