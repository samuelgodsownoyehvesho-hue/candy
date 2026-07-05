import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

interface AppShellProps {
  title: string;
  children: ReactNode;
  onCreateProject?: () => void;
}

export function AppShell({ title, children, onCreateProject }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-void theme-light:bg-paper">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} onCreateProject={onCreateProject} />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
