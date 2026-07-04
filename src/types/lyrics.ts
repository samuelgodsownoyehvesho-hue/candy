export interface LyricWord {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words: LyricWord[];
}

export type LyricSyncStatus = 'none' | 'line-synced' | 'word-synced';

export interface LyricsDocument {
  rawText: string;
  lines: LyricLine[];
  syncStatus: LyricSyncStatus;
  /** true if the last sync came from Grok, false if it used the local proportional fallback */
  syncedWithAI: boolean;
  updatedAt: string;
}

export interface SilenceGap {
  start: number;
  end: number;
}

export interface LineTiming {
  lineIndex: number;
  startTime: number;
  endTime: number;
}
