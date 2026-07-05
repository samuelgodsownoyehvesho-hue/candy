import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  IconHome,
  IconFolder,
  IconWaveform,
  IconSettings,
  IconHelp,
  IconInfo,
} from '@/components/icons/Icons';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/projects', label: 'My Projects', icon: IconFolder },
];

const FOOTER_ITEMS = [
  { to: '/settings', label: 'Settings', icon: IconSettings },
  { to: '/help', label: 'Help', icon: IconHelp },
  { to: '/about', label: 'About', icon: IconInfo },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen sticky top-0 glass-panel border-r border-void-line">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber to-teal flex items-center justify-center">
          <IconWaveform size={16} className="text-obsidian" />
        </div>
        <span className="font-display font-semibold text-lg tracking-tight">Cadence</span>
      </div>

      <nav className="flex-1 px-3 space-y-1" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors btn-focus-ring',
                isActive
                  ? 'bg-white/[0.06] text-ink'
                  : 'text-ink-muted hover:text-ink hover:bg-white/[0.04]',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 space-y-1 border-t border-void-line pt-3">
        {FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors btn-focus-ring',
                isActive
                  ? 'bg-white/[0.06] text-ink'
                  : 'text-ink-muted hover:text-ink hover:bg-white/[0.04]',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
