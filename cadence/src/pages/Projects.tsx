import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { useProjects } from '@/context/ProjectContext';
import {
  IconSearch,
  IconPlus,
  IconGrid,
  IconFolder,
  IconUpload,
  IconArchive,
} from '@/components/icons/Icons';
import type { Project, ProjectStatus } from '@/types/project';
import { PROJECT_STATUS_LABEL } from '@/types/project';
import clsx from 'clsx';

type FilterTab = 'all' | ProjectStatus;
type ViewMode = 'grid' | 'list';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'ready', label: 'Ready' },
  { key: 'archived', label: 'Archived' },
];

export function Projects() {
  const { projects, createProject, renameProject, deleteProject, importProject } = useProjects();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return projects
      .filter((p) => (filter === 'all' ? p.status !== 'archived' : p.status === filter))
      .filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, filter, query]);

  function handleCreate() {
    createProject({ title: newTitle.trim() || 'Untitled project' });
    setNewTitle('');
    setCreateOpen(false);
  }

  async function handleImportFile(file: File) {
    const result = await importProject(file);
    if (!result) {
      setImportError('That file could not be read as a Cadence project. Make sure it is a .json export from Cadence.');
    }
  }

  return (
    <AppShell title="My Projects" onCreateProject={() => setCreateOpen(true)}>
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <IconSearch
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects"
            className="w-full glass-raised rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center glass-raised rounded-xl p-1">
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              className={clsx(
                'p-1.5 rounded-lg transition-colors btn-focus-ring',
                view === 'grid' ? 'bg-white/10 text-ink' : 'text-ink-dim hover:text-ink',
              )}
            >
              <IconGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              aria-pressed={view === 'list'}
              className={clsx(
                'p-1.5 rounded-lg transition-colors btn-focus-ring',
                view === 'list' ? 'bg-white/10 text-ink' : 'text-ink-dim hover:text-ink',
              )}
            >
              <IconFolder size={16} />
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} iconLeft={<IconUpload size={14} />}>
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
          <Button size="sm" onClick={() => setCreateOpen(true)} iconLeft={<IconPlus size={14} />}>
            New
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors btn-focus-ring',
              filter === tab.key
                ? 'bg-gradient-to-r from-amber to-amber-deep text-void'
                : 'glass-raised text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center text-center gap-4">
          <IconArchive size={28} className="text-ink-dim" />
          <div>
            <h3 className="font-display font-semibold text-ink mb-1">
              {query ? 'No projects match your search' : `No ${filter === 'all' ? '' : FILTER_TABS.find((t) => t.key === filter)?.label.toLowerCase() + ' '}projects`}
            </h3>
            <p className="text-sm text-ink-muted max-w-xs">
              {query ? 'Try a different search term.' : 'Create a new project or import one from a file.'}
            </p>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className={clsx(
                project.id === highlightId && 'ring-2 ring-teal rounded-2xl',
              )}
            >
              <ProjectCard
                project={project}
                onRequestRename={(p) => {
                  setRenameTarget(p);
                  setRenameValue(p.title);
                }}
                onRequestDelete={(p) => setDeleteTarget(p)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl divide-y divide-void-line overflow-hidden">
          {filtered.map((project) => (
            <div key={project.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={clsx('h-9 w-9 rounded-lg bg-gradient-to-br shrink-0', project.thumbnail.value)} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{project.title}</p>
                <p className="text-xs text-ink-dim">{PROJECT_STATUS_LABEL[project.status]}</p>
              </div>
              <button
                onClick={() => {
                  setRenameTarget(project);
                  setRenameValue(project.title);
                }}
                className="text-xs text-teal hover:text-teal-soft btn-focus-ring rounded px-2 py-1"
              >
                Rename
              </button>
              <button
                onClick={() => setDeleteTarget(project)}
                className="text-xs text-clip-soft hover:text-clip btn-focus-ring rounded px-2 py-1"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New project">
        <input
          autoFocus
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Untitled project"
          className="w-full glass-raised rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename project">
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && renameTarget) {
              renameProject(renameTarget.id, renameValue);
              setRenameTarget(null);
            }
          }}
          className="w-full glass-raised rounded-xl px-4 py-3 text-sm text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRenameTarget(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (renameTarget) renameProject(renameTarget.id, renameValue);
              setRenameTarget(null);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete project?"
        description={`"${deleteTarget?.title}" will be permanently removed. This can't be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (deleteTarget) deleteProject(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>

      {/* Import error */}
      <Modal open={!!importError} onClose={() => setImportError(null)} title="Import failed">
        <p className="text-sm text-ink-muted mb-4">{importError}</p>
        <div className="flex justify-end">
          <Button onClick={() => setImportError(null)}>Got it</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
