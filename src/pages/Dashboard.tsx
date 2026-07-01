import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { AmbientMeter } from '@/components/ui/AmbientMeter';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { useProjects } from '@/context/ProjectContext';
import { IconPlus, IconArrowRight, IconClock, IconFolder, IconCheck } from '@/components/icons/Icons';
import type { Project } from '@/types/project';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function Dashboard() {
  const navigate = useNavigate();
  const { activeProjects, createProject, renameProject, deleteProject, isHydrated } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useKeyboardShortcuts([
    { key: 'n', ctrlOrCmd: true, handler: () => setCreateOpen(true) },
  ]);

  const stats = useMemo(() => {
    const inProgress = activeProjects.filter((p) => p.status === 'in-progress').length;
    const ready = activeProjects.filter((p) => p.status === 'ready').length;
    const drafts = activeProjects.filter((p) => p.status === 'draft').length;
    return { total: activeProjects.length, inProgress, ready, drafts };
  }, [activeProjects]);

  const recent = useMemo(
    () =>
      [...activeProjects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [activeProjects],
  );

  function handleCreate() {
    const title = newTitle.trim() || 'Untitled project';
    const project = createProject({ title });
    setNewTitle('');
    setCreateOpen(false);
    navigate(`/projects?highlight=${project.id}`);
  }

  return (
    <AppShell title="Dashboard" onCreateProject={() => setCreateOpen(true)}>
      {/* Hero panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative glass-panel rounded-2xl p-6 md:p-8 mb-6 overflow-hidden"
      >
        <div className="absolute inset-x-0 bottom-0 h-24 opacity-20 pointer-events-none">
          <AmbientMeter bars={56} energy={0.5} />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <p className="readout text-amber mb-2">SESSION OVERVIEW</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink">
              {stats.total === 0 ? 'Start your first project' : `${stats.total} active project${stats.total === 1 ? '' : 's'}`}
            </h2>
            <p className="text-ink-muted text-sm mt-1.5 max-w-md">
              {stats.total === 0
                ? 'Upload a track and let Cadence propose a sync, palette, and template to begin with.'
                : `${stats.ready} ready to export · ${stats.inProgress} in progress · ${stats.drafts} draft${stats.drafts === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} iconLeft={<IconPlus size={16} />}>
            New project
          </Button>
        </div>
      </motion.div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile icon={<IconFolder size={18} />} label="Total projects" value={stats.total} accent="amber" />
        <StatTile icon={<IconClock size={18} />} label="In progress" value={stats.inProgress} accent="teal" />
        <StatTile icon={<IconCheck size={18} />} label="Ready to export" value={stats.ready} accent="teal" />
        <StatTile icon={<IconFolder size={18} />} label="Drafts" value={stats.drafts} accent="amber" />
      </div>

      {/* Recent projects */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-ink">Recent projects</h3>
        <button
          onClick={() => navigate('/projects')}
          className="btn-focus-ring flex items-center gap-1.5 text-sm text-teal hover:text-teal-soft transition-colors rounded-md"
        >
          View all <IconArrowRight size={14} />
        </button>
      </div>

      {!isHydrated ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl glass-panel animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recent.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onRequestRename={(p) => {
                setRenameTarget(p);
                setRenameValue(p.title);
              }}
              onRequestDelete={(p) => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New project"
        description="Name your project — you can change this anytime."
      >
        <input
          autoFocus
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Midnight Drive — Lyric Video"
          className="w-full glass-raised rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create project</Button>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Rename project"
      >
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
    </AppShell>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: 'amber' | 'teal';
}) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
      <div
        className={`h-10 w-10 rounded-xl flex items-center justify-center ${
          accent === 'amber' ? 'bg-amber/15 text-amber' : 'bg-teal/15 text-teal'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="font-display text-xl font-semibold text-ink leading-none">{value}</p>
        <p className="text-xs text-ink-muted mt-1">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="glass-panel rounded-2xl p-12 flex flex-col items-center text-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber to-teal flex items-center justify-center">
        <IconPlus size={20} className="text-void" />
      </div>
      <div>
        <h3 className="font-display font-semibold text-ink mb-1">No projects yet</h3>
        <p className="text-sm text-ink-muted max-w-xs">
          Create your first project to start syncing lyrics to your track.
        </p>
      </div>
      <Button onClick={onCreate} iconLeft={<IconPlus size={16} />}>
        New project
      </Button>
    </div>
  );
}
