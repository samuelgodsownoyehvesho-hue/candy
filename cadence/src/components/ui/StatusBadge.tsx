import clsx from 'clsx';
import { PROJECT_STATUS_LABEL, type ProjectStatus } from '@/types/project';

const dotClasses: Record<ProjectStatus, string> = {
  draft: 'bg-ink-muted',
  'in-progress': 'bg-amber',
  ready: 'bg-teal',
  archived: 'bg-ink-dim',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <span className={clsx('h-1.5 w-1.5 rounded-full', dotClasses[status])} />
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}
