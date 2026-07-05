import { useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/context/ThemeContext';
import { useProjects } from '@/context/ProjectContext';
import { IconSun, IconMoon, IconDownload, IconUpload, IconTrash, IconKeyboard } from '@/components/icons/Icons';

const SHORTCUTS = [
  { keys: ['Ctrl', 'N'], action: 'Create new project' },
  { keys: ['Esc'], action: 'Close dialog' },
  { keys: ['Enter'], action: 'Confirm dialog input' },
];

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { projects, importProject } = useProjects();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  function exportAll() {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cadence-all-projects.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const result = await importProject(file);
    setImportMsg(result ? `Imported "${result.title}".` : 'Could not import that file.');
  }

  function wipeAllData() {
    window.localStorage.removeItem('cadence:projects');
    window.location.reload();
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Appearance */}
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="font-display font-semibold text-ink mb-1">Appearance</h2>
          <p className="text-sm text-ink-muted mb-4">Choose how Cadence looks on this device.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center gap-2 justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors btn-focus-ring ${
                theme === 'dark' ? 'bg-gradient-to-r from-amber to-amber-deep text-obsidian' : 'glass-raised text-ink-muted'
              }`}
            >
              <IconMoon size={16} /> Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center gap-2 justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors btn-focus-ring ${
                theme === 'light' ? 'bg-gradient-to-r from-amber to-amber-deep text-obsidian' : 'glass-raised text-ink-muted'
              }`}
            >
              <IconSun size={16} /> Light
            </button>
          </div>
        </section>

        {/* Data management */}
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="font-display font-semibold text-ink mb-1">Data</h2>
          <p className="text-sm text-ink-muted mb-4">
            Projects are stored locally in this browser. Export regularly to back them up.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" iconLeft={<IconDownload size={14} />} onClick={exportAll}>
              Export all projects
            </Button>
            <Button variant="secondary" size="sm" iconLeft={<IconUpload size={14} />} onClick={() => fileInputRef.current?.click()}>
              Import project
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = '';
              }}
            />
            <Button variant="danger" size="sm" iconLeft={<IconTrash size={14} />} onClick={() => setWipeOpen(true)}>
              Erase all local data
            </Button>
          </div>
          <p className="text-xs text-ink-dim mt-3">{projects.length} project(s) stored locally.</p>
        </section>

        {/* Keyboard shortcuts */}
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="font-display font-semibold text-ink mb-1 flex items-center gap-2">
            <IconKeyboard size={18} className="text-teal" /> Keyboard shortcuts
          </h2>
          <div className="mt-4 space-y-2">
            {SHORTCUTS.map((s) => (
              <div key={s.action} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{s.action}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="readout px-2 py-1 rounded-md glass-raised text-ink">
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Modal
        open={wipeOpen}
        onClose={() => setWipeOpen(false)}
        title="Erase all local data?"
        description="This permanently deletes every project stored in this browser. Export first if you want to keep them."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setWipeOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={wipeAllData}>
            Erase everything
          </Button>
        </div>
      </Modal>

      <Modal open={!!importMsg} onClose={() => setImportMsg(null)} title="Import">
        <p className="text-sm text-ink-muted mb-4">{importMsg}</p>
        <div className="flex justify-end">
          <Button onClick={() => setImportMsg(null)}>Close</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
