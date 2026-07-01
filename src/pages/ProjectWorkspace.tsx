import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProjects } from '@/context/ProjectContext';
import {
  IconWaveform,
  IconUpload,
  IconPencil,
  IconCopy,
  IconArchive,
  IconTrash,
  IconDownload,
  IconClock,
  IconCheck,
} from '@/components/icons/Icons';
import { PROJECT_STATUS_LABEL, type ProjectStatus } from '@/types/project';
import clsx from 'clsx';

const SUPPORTED_AUDIO_EXT = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'] as const;
type SupportedExt = (typeof SUPPORTED_AUDIO_EXT)[number];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    projects,
    renameProject,
    setProjectStatus,
    duplicateProject,
    archiveProject,
    deleteProject,
    exportProject,
    updateProjectAudio,
  } = useProjects();

  // Re-derive from live `projects` so UI updates immediately on any change
  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id]);

  const [titleDraft, setTitleDraft] = useState(project?.title ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!project) {
    return (
      <AppShell title="Project not found">
        <div className="glass-panel rounded-2xl p-12 text-center">
          <p className="text-ink-muted mb-4">This project doesn't exist or was deleted.</p>
          <Button onClick={() => navigate('/projects')}>Back to projects</Button>
        </div>
      </AppShell>
    );
  }

  function handleAudioFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_AUDIO_EXT.includes(ext as SupportedExt)) {
      setAudioError(`Unsupported format ".${ext}". Use one of: ${SUPPORTED_AUDIO_EXT.join(', ').toUpperCase()}.`);
      return;
    }
    setAudioError(null);
    const url = URL.createObjectURL(file);
    const audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.src = url;
    audioEl.onloadedmetadata = () => {
      if (id) {
        updateProjectAudio(id, {
          fileName: file.name,
          format: ext as SupportedExt,
          durationSeconds: Number.isFinite(audioEl.duration) ? audioEl.duration : null,
        });
      }
      URL.revokeObjectURL(url);
    };
    audioEl.onerror = () => {
      setAudioError('Could not read that audio file. It may be corrupted.');
      URL.revokeObjectURL(url);
    };
  }

  return (
    <AppShell title="Project">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    renameProject(project.id, titleDraft);
                    setEditingTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameProject(project.id, titleDraft);
                      setEditingTitle(false);
                    }
                  }}
                  className="font-display text-2xl font-semibold bg-transparent outline-none border-b-2 border-teal text-ink w-full"
                />
              ) : (
                <button
                  onClick={() => {
                    setTitleDraft(project.title);
                    setEditingTitle(true);
                  }}
                  className="group flex items-center gap-2 text-left btn-focus-ring rounded-md"
                >
                  <h2 className="font-display text-2xl font-semibold text-ink">{project.title}</h2>
                  <IconPencil size={15} className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={project.status} />
                <span className="text-xs text-ink-dim">
                  Updated {new Date(project.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" iconLeft={<IconCopy size={14} />} onClick={() => duplicateProject(project.id)}>
                Duplicate
              </Button>
              <Button variant="secondary" size="sm" iconLeft={<IconDownload size={14} />} onClick={() => exportProject(project.id)}>
                Export
              </Button>
              {project.status === 'archived' ? null : (
                <Button variant="secondary" size="sm" iconLeft={<IconArchive size={14} />} onClick={() => archiveProject(project.id)}>
                  Archive
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                iconLeft={<IconTrash size={14} />}
                onClick={() => {
                  if (confirm(`Delete "${project.title}" permanently?`)) {
                    deleteProject(project.id);
                    navigate('/projects');
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1.5 mt-5 flex-wrap">
            {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[])
              .filter((s) => s !== 'archived')
              .map((status) => (
                <button
                  key={status}
                  onClick={() => setProjectStatus(project.id, status)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors btn-focus-ring',
                    project.status === status
                      ? 'bg-gradient-to-r from-amber to-amber-deep text-void'
                      : 'glass-raised text-ink-muted hover:text-ink',
                  )}
                >
                  {PROJECT_STATUS_LABEL[status]}
                </button>
              ))}
          </div>
        </div>

        {/* Audio panel */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <h3 className="font-display font-semibold text-ink mb-1 flex items-center gap-2">
            <IconWaveform size={18} className="text-teal" /> Audio source
          </h3>
          <p className="text-sm text-ink-muted mb-4">
            Supports MP3, WAV, FLAC, OGG, AAC, M4A. Waveform display, AI BPM/mood/genre
            detection, and the full lyric sync editor arrive in the next build phase —
            this step captures your source track and its duration now.
          </p>

          {project.audio.fileName ? (
            <div className="flex items-center justify-between glass-raised rounded-xl p-4">
              <div>
                <p className="text-sm font-medium text-ink">{project.audio.fileName}</p>
                <p className="text-xs text-ink-dim readout mt-1">
                  {project.audio.format?.toUpperCase()}
                  {project.audio.durationSeconds ? ` · ${formatDuration(project.audio.durationSeconds)}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                Replace
              </Button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass-raised rounded-xl border-2 border-dashed border-void-line hover:border-teal/40 p-8 flex flex-col items-center gap-2 text-ink-muted hover:text-ink transition-colors btn-focus-ring"
            >
              <IconUpload size={22} />
              <span className="text-sm font-medium">Click to upload a track</span>
              <span className="text-xs text-ink-dim">MP3 · WAV · FLAC · OGG · AAC · M4A</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.flac,.ogg,.aac,.m4a,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAudioFile(file);
              e.target.value = '';
            }}
          />
          {audioError && <p className="text-xs text-clip-soft mt-3">{audioError}</p>}
        </div>

        {/* Version history */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
            <IconClock size={18} className="text-amber" /> Version history
          </h3>
          <div className="space-y-3">
            {[...project.versions].reverse().map((v) => (
              <div key={v.id} className="flex items-center gap-3 text-sm">
                <IconCheck size={14} className="text-teal shrink-0" />
                <span className="text-ink-muted flex-1">{v.label}</span>
                <span className="readout text-ink-dim text-xs">
                  {new Date(v.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Audio metadata writes go through ProjectContext's updateProjectAudio,
 * which the full Audio Engine slice will extend with waveform peaks, BPM,
 * mood, and genre detection once that slice lands.
 */
