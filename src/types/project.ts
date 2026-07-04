/**
 * Core data model for a Cadence project.
 *
 * Slice 1 (this build) actively uses the metadata fields below to power
 * project CRUD, the dashboard, and My Projects. The `audio`, `lyrics`,
 * `timeline`, and `export` fields are part of the full schema and are
 * populated by later slices (Audio Engine, Lyric Editor, Timeline Editor,
 * Export Center) — they are typed now so every later slice writes into a
 * stable, already-agreed shape rather than bolting types on after the fact.
 */

import type { VisualizerConfig, VisualizerType } from './visualizer';

export type ProjectStatus = 'draft' | 'in-progress' | 'ready' | 'archived';

export interface ProjectAudioMeta {
  fileName: string | null;
  durationSeconds: number | null;
  format: 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac' | 'm4a' | null;
  bpm: number | null;
  mood: string | null;
  genre: string | null;
}

export interface ProjectVisualizerSettings {
  type: VisualizerType;
  config: VisualizerConfig;
}

export interface ProjectThumbnail {
  /** data URL or generated gradient seed used for the project card art */
  kind: 'gradient' | 'image';
  value: string;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  archivedAt: string | null;
  thumbnail: ProjectThumbnail;
  audio: ProjectAudioMeta;
  templateId: string | null;
  durationLabel: string | null;
  /** lightweight progress indicator surfaced on dashboard/cards, 0-100 */
  completion: number;
  visualizer: ProjectVisualizerSettings | null;
  /** simple linear version history of title/status snapshots */
  versions: ProjectVersionEntry[];
}

export interface ProjectVersionEntry {
  id: string;
  timestamp: string;
  label: string;
  snapshot: Pick<Project, 'title' | 'status' | 'completion'>;
}

export interface ProjectCreateInput {
  title: string;
  templateId?: string | null;
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Draft',
  'in-progress': 'In progress',
  ready: 'Ready to export',
  archived: 'Archived',
};

export const GRADIENT_SEEDS = [
  'from-amber via-amber-soft to-teal',
  'from-teal via-amber-soft to-amber',
  'from-amber-deep via-amber to-teal-soft',
  'from-teal-deep via-teal to-amber-soft',
  'from-clip via-amber to-teal',
] as const;
