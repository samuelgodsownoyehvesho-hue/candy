import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { nanoid } from 'nanoid';
import { loadJSON, saveJSON } from '@/lib/storage';
import { deleteAudioBlob } from '@/lib/audioDb';
import {
  GRADIENT_SEEDS,
  type Project,
  type ProjectCreateInput,
  type ProjectStatus,
} from '@/types/project';

interface ProjectContextValue {
  projects: Project[];
  activeProjects: Project[];
  archivedProjects: Project[];
  isHydrated: boolean;
  lastSavedAt: string | null;
  createProject: (input: ProjectCreateInput) => Project;
  renameProject: (id: string, title: string) => void;
  duplicateProject: (id: string) => Project | null;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
  restoreProject: (id: string) => void;
  setProjectStatus: (id: string, status: ProjectStatus) => void;
  exportProject: (id: string) => void;
  importProject: (file: File) => Promise<Project | null>;
  getProject: (id: string) => Project | undefined;
  updateProjectAudio: (id: string, meta: Partial<Project['audio']>) => void;
  updateProjectVisualizer: (id: string, settings: Project['visualizer']) => void;
  updateProjectLyrics: (id: string, lyrics: Project['lyrics']) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = 'projects';
let gradientCursor = 0;

function nextGradient(): string {
  const seed = GRADIENT_SEEDS[gradientCursor % GRADIENT_SEEDS.length];
  gradientCursor += 1;
  return seed;
}

function makeProject(input: ProjectCreateInput): Project {
  const now = new Date().toISOString();
  const id = nanoid(10);
  return {
    id,
    title: input.title.trim() || 'Untitled project',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    thumbnail: { kind: 'gradient', value: nextGradient() },
    audio: {
      fileName: null,
      durationSeconds: null,
      format: null,
      bpm: null,
      mood: null,
      genre: null,
    },
    templateId: input.templateId ?? null,
    durationLabel: null,
    completion: 0,
    visualizer: null,
    lyrics: null,
    versions: [
      {
        id: nanoid(8),
        timestamp: now,
        label: 'Project created',
        snapshot: { title: input.title.trim() || 'Untitled project', status: 'draft', completion: 0 },
      },
    ],
  };
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Hydrate once on mount
  useEffect(() => {
    const stored = loadJSON<Project[]>(STORAGE_KEY, []);
    setProjects(stored);
    setIsHydrated(true);
  }, []);

  // Debounced autosave whenever projects change, after hydration
  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveJSON(STORAGE_KEY, projects);
      setLastSavedAt(new Date().toISOString());
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [projects, isHydrated]);

  const createProject = useCallback((input: ProjectCreateInput): Project => {
    const project = makeProject(input);
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const touchAndUpdate = useCallback(
    (id: string, updater: (project: Project) => Project) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...updater(p), updatedAt: new Date().toISOString() } : p,
        ),
      );
    },
    [],
  );

  const renameProject = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      touchAndUpdate(id, (p) => ({
        ...p,
        title: trimmed,
        versions: [
          ...p.versions,
          {
            id: nanoid(8),
            timestamp: new Date().toISOString(),
            label: 'Renamed',
            snapshot: { title: trimmed, status: p.status, completion: p.completion },
          },
        ],
      }));
    },
    [touchAndUpdate],
  );

  const duplicateProject = useCallback(
    (id: string): Project | null => {
      let result: Project | null = null;
      setProjects((prev) => {
        const source = prev.find((p) => p.id === id);
        if (!source) return prev;
        const now = new Date().toISOString();
        const copy: Project = {
          ...source,
          id: nanoid(10),
          title: `${source.title} copy`,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
          versions: [
            {
              id: nanoid(8),
              timestamp: now,
              label: `Duplicated from "${source.title}"`,
              snapshot: { title: `${source.title} copy`, status: source.status, completion: source.completion },
            },
          ],
        };
        result = copy;
        const sourceIndex = prev.findIndex((p) => p.id === id);
        const next = [...prev];
        next.splice(sourceIndex + 1, 0, copy);
        return next;
      });
      return result;
    },
    [],
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    void deleteAudioBlob(id);
  }, []);

  const archiveProject = useCallback(
    (id: string) => {
      touchAndUpdate(id, (p) => ({
        ...p,
        status: 'archived',
        archivedAt: new Date().toISOString(),
      }));
    },
    [touchAndUpdate],
  );

  const restoreProject = useCallback(
    (id: string) => {
      touchAndUpdate(id, (p) => ({
        ...p,
        status: 'draft',
        archivedAt: null,
      }));
    },
    [touchAndUpdate],
  );

  const setProjectStatus = useCallback(
    (id: string, status: ProjectStatus) => {
      touchAndUpdate(id, (p) => ({
        ...p,
        status,
        completion: status === 'ready' ? 100 : p.completion,
      }));
    },
    [touchAndUpdate],
  );

  const exportProject = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id);
      if (!project) return;
      const safeName = project.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
      downloadJSON(`cadence-${safeName || 'project'}.json`, project);
    },
    [projects],
  );

  const importProject = useCallback(async (file: File): Promise<Project | null> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<Project>;
      if (!parsed || typeof parsed.title !== 'string') {
        throw new Error('Invalid project file');
      }
      const now = new Date().toISOString();
      const imported: Project = {
        ...makeProject({ title: `${parsed.title} (imported)`, templateId: parsed.templateId ?? null }),
        status: (parsed.status as ProjectStatus) ?? 'draft',
        audio: parsed.audio ?? {
          fileName: null,
          durationSeconds: null,
          format: null,
          bpm: null,
          mood: null,
          genre: null,
        },
        thumbnail: parsed.thumbnail ?? { kind: 'gradient', value: nextGradient() },
        durationLabel: parsed.durationLabel ?? null,
        completion: typeof parsed.completion === 'number' ? parsed.completion : 0,
        visualizer: parsed.visualizer ?? null,
        lyrics: parsed.lyrics ?? null,
        versions: [
          {
            id: nanoid(8),
            timestamp: now,
            label: 'Imported from file',
            snapshot: {
              title: `${parsed.title} (imported)`,
              status: (parsed.status as ProjectStatus) ?? 'draft',
              completion: typeof parsed.completion === 'number' ? parsed.completion : 0,
            },
          },
        ],
      };
      setProjects((prev) => [imported, ...prev]);
      return imported;
    } catch {
      return null;
    }
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const updateProjectAudio = useCallback(
    (id: string, meta: Partial<Project['audio']>) => {
      touchAndUpdate(id, (p) => ({
        ...p,
        audio: { ...p.audio, ...meta },
        status: p.status === 'draft' ? 'in-progress' : p.status,
        completion: Math.max(p.completion, 20),
        versions: [
          ...p.versions,
          {
            id: nanoid(8),
            timestamp: new Date().toISOString(),
            label: meta.fileName ? `Audio source set: ${meta.fileName}` : 'Audio updated',
            snapshot: { title: p.title, status: p.status, completion: Math.max(p.completion, 20) },
          },
        ],
      }));
    },
    [touchAndUpdate],
  );

  // Deliberately no version-history entry here: this fires on a debounce
  // while the person is actively dragging sliders, so logging every tweak
  // would flood the version history with noise. Audio/status changes above
  // are discrete, meaningful events and still get logged.
  const updateProjectVisualizer = useCallback(
    (id: string, settings: Project['visualizer']) => {
      touchAndUpdate(id, (p) => ({
        ...p,
        visualizer: settings,
        status: p.status === 'draft' ? 'in-progress' : p.status,
        completion: Math.max(p.completion, 35),
      }));
    },
    [touchAndUpdate],
  );

  // Same reasoning as updateProjectVisualizer: fires on a debounce while
  // dragging timeline handles, so no version-history entry per call.
  const updateProjectLyrics = useCallback(
    (id: string, lyrics: Project['lyrics']) => {
      touchAndUpdate(id, (p) => ({
        ...p,
        lyrics,
        status: p.status === 'draft' ? 'in-progress' : p.status,
        completion: Math.max(p.completion, lyrics?.syncStatus === 'transcribed' ? 60 : p.completion),
      }));
    },
    [touchAndUpdate],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'archived'),
    [projects],
  );
  const archivedProjects = useMemo(
    () => projects.filter((p) => p.status === 'archived'),
    [projects],
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProjects,
      archivedProjects,
      isHydrated,
      lastSavedAt,
      createProject,
      renameProject,
      duplicateProject,
      deleteProject,
      archiveProject,
      restoreProject,
      setProjectStatus,
      exportProject,
      importProject,
      getProject,
      updateProjectAudio,
      updateProjectVisualizer,
      updateProjectLyrics,
    }),
    [
      projects,
      activeProjects,
      archivedProjects,
      isHydrated,
      lastSavedAt,
      createProject,
      renameProject,
      duplicateProject,
      deleteProject,
      archiveProject,
      restoreProject,
      setProjectStatus,
      exportProject,
      importProject,
      getProject,
      updateProjectAudio,
      updateProjectVisualizer,
      updateProjectLyrics,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within a ProjectProvider');
  return ctx;
}
