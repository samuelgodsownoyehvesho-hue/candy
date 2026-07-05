import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { Project } from '@/types/project';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  IconMore,
  IconPencil,
  IconCopy,
  IconArchive,
  IconTrash,
  IconDownload,
  IconCheck,
} from '@/components/icons/Icons';
import { useProjects } from '@/context/ProjectContext';

interface ProjectCardProps {
  project: Project;
  onRequestRename: (project: Project) => void;
  onRequestDelete: (project: Project) => void;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ProjectCard({ project, onRequestRename, onRequestDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const { duplicateProject, archiveProject, restoreProject, exportProject } = useProjects();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  return (
    <div className="group relative glass-panel rounded-2xl overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1">
      <button
        className={clsx(
          'relative h-36 w-full bg-gradient-to-br',
          project.thumbnail.value,
          'flex items-end p-4 text-left btn-focus-ring',
        )}
        onClick={() => navigate(`/projects/${project.id}`)}
        aria-label={`Open ${project.title}`}
      >
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        <div className="absolute top-3 right-3">
          <span className="readout px-2 py-1 rounded-md bg-black/30 text-white/90">
            {project.completion}%
          </span>
        </div>
      </button>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-ink leading-snug line-clamp-1">
            {project.title}
          </h3>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`More actions for ${project.title}`}
              className="btn-focus-ring p-1 rounded-md text-ink-muted hover:text-ink hover:bg-white/5"
            >
              <IconMore size={16} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1 w-44 glass-panel rounded-xl py-1.5 z-10 shadow-glass"
              >
                <MenuItem
                  icon={<IconPencil size={14} />}
                  label="Rename"
                  onClick={() => {
                    onRequestRename(project);
                    setMenuOpen(false);
                  }}
                />
                <MenuItem
                  icon={<IconCopy size={14} />}
                  label="Duplicate"
                  onClick={() => {
                    duplicateProject(project.id);
                    setMenuOpen(false);
                  }}
                />
                <MenuItem
                  icon={<IconDownload size={14} />}
                  label="Export JSON"
                  onClick={() => {
                    exportProject(project.id);
                    setMenuOpen(false);
                  }}
                />
                {project.status === 'archived' ? (
                  <MenuItem
                    icon={<IconCheck size={14} />}
                    label="Restore"
                    onClick={() => {
                      restoreProject(project.id);
                      setMenuOpen(false);
                    }}
                  />
                ) : (
                  <MenuItem
                    icon={<IconArchive size={14} />}
                    label="Archive"
                    onClick={() => {
                      archiveProject(project.id);
                      setMenuOpen(false);
                    }}
                  />
                )}
                <div className="my-1 h-px bg-void-line" />
                <MenuItem
                  icon={<IconTrash size={14} />}
                  label="Delete"
                  tone="danger"
                  onClick={() => {
                    onRequestDelete(project);
                    setMenuOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <StatusBadge status={project.status} />

        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-ink-dim">
          <span>{timeAgo(project.updatedAt)}</span>
          {project.audio.bpm && <span className="readout">{project.audio.bpm} BPM</span>}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
        tone === 'danger'
          ? 'text-clip-soft hover:bg-clip/10'
          : 'text-ink-muted hover:text-ink hover:bg-white/5',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
