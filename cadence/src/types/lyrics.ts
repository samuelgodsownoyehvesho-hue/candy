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

export type LyricSyncStatus = 'none' | 'transcribed';

export interface LyricsDocument {
  lines: LyricLine[];
  syncStatus: LyricSyncStatus;
  /** true if these lines came from Groq Whisper transcription, false if added/edited manually */
  transcribedWithAI: boolean;
  updatedAt: string;
}
