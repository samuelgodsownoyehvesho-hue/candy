import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import {
  IconSun,
  IconMoon,
  IconPlus,
  IconWaveform,
  IconHome,
  IconFolder,
  IconSettings,
  IconHelp,
  IconInfo,
  IconClose,
} from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';

const MOBILE_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/projects', label: 'My Projects', icon: IconFolder },
  { to: '/settings', label: 'Settings', icon: IconSettings },
  { to: '/help', label: 'Help', icon: IconHelp },
  { to: '/about', label: 'About', icon: IconInfo },
];

interface TopbarProps {
  title: string;
  onCreateProject?: () => void;
}

export function Topbar({ title, onCreateProject }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-8 py-4 glass-panel border-b border-void-line">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden h-9 w-9 rounded-lg bg-gradient-to-br from-amber to-teal flex items-center justify-center btn-focus-ring"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <IconWaveform size={16} className="text-void" />
          </button>
          <h1 className="font-display text-lg md:text-xl font-semibold text-ink">{title}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="btn-focus-ring p-2.5 rounded-xl glass-raised text-ink-muted hover:text-ink transition-colors"
          >
            {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
          <Button
            size="sm"
            onClick={onCreateProject ?? (() => navigate('/projects'))}
            iconLeft={<IconPlus size={15} />}
          >
            <span className="hidden sm:inline">New project</span>
          </Button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <div
        className={clsx(
          'fixed inset-0 z-40 md:hidden transition-opacity',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <div
          className={clsx(
            'absolute left-0 top-0 h-full w-72 glass-panel border-r border-void-line p-5 transition-transform duration-300',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber to-teal flex items-center justify-center">
                <IconWaveform size={16} className="text-void" />
              </div>
              <span className="font-display font-semibold text-lg">Cadence</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="btn-focus-ring p-1.5 rounded-lg text-ink-muted hover:text-ink"
            >
              <IconClose size={18} />
            </button>
          </div>
          <nav className="space-y-1" aria-label="Mobile primary">
            {MOBILE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive ? 'bg-white/[0.06] text-ink' : 'text-ink-muted hover:text-ink',
                  )
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
