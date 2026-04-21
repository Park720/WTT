'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useMemo, useState, useEffect } from 'react';
import { Avatar, Icon, Logo } from '@/components/ui';
import { useToast } from '@/components/Toaster';

const APP_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'Home',     href: '/dashboard' },
  { key: 'planner',   label: 'Planner',   icon: 'List',     project: 'planner' },
  { key: 'calendar',  label: 'Calendar',  icon: 'Calendar', project: 'calendar' },
  { key: 'pomodoro',  label: 'Pomodoro',  icon: 'Timer',    project: 'timer' },
];

function NavItem({ icon, label, href, active, disabled, onClick }) {
  const IconCmp = Icon[icon];
  const content = (
    <>
      <IconCmp className="w-4 h-4 shrink-0" />
      <span className="font-medium">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
    </>
  );
  const cls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors
    ${active ? 'bg-white/10 text-white' : disabled ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`;

  if (disabled || !href) {
    return (
      <button type="button" onClick={onClick} className={cls} disabled={disabled} title={disabled ? 'Open a project to access this view' : undefined}>
        {content}
      </button>
    );
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

export default function Sidebar({ user, projects = [] }) {
  const pathname = usePathname();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  // ⌘/Ctrl+K — opens search (placeholder until the command palette ships)
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toast.show('Command palette is coming soon — search by project or task title.', { type: 'info' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toast]);

  const handleSearchClick = () => {
    toast.show('Command palette is coming soon.', { type: 'info' });
  };

  const match = pathname.match(/^\/project\/([^/]+)/);
  const activeProjectId = match?.[1] ?? null;
  const contextProjectId = activeProjectId ?? projects[0]?.id ?? null;

  const navItems = useMemo(
    () =>
      APP_NAV.map((item) => {
        if (item.href) {
          return { ...item, href: item.href, active: pathname === item.href };
        }
        const href = contextProjectId ? `/project/${contextProjectId}/${item.project}` : null;
        const active = activeProjectId && pathname.startsWith(`/project/${activeProjectId}/${item.project}`);
        return { ...item, href, active, disabled: !href };
      }),
    [pathname, contextProjectId, activeProjectId],
  );

  const firstName = user.name?.split(' ')[0] ?? user.email.split('@')[0];

  return (
    <aside className="w-[232px] bg-slate-900 text-slate-100 shrink-0 sticky top-0 h-screen flex flex-col">
      <div className="px-4 py-4 flex items-center">
        <Link href="/dashboard">
          <Logo size={16} dark />
        </Link>
      </div>

      <div className="px-3 mt-1">
        <button
          type="button"
          onClick={handleSearchClick}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
        >
          <Icon.Search className="w-3.5 h-3.5" />
          <span className="text-slate-400">Search</span>
          <kbd className="ml-auto font-mono text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      <nav className="mt-4 flex-1 px-2 space-y-0.5 overflow-y-auto nice-scroll">
        {navItems.map(({ key, ...rest }) => (
          <NavItem key={key} {...rest} />
        ))}

        {projects.length > 0 && (
          <>
            <div className="mt-5 mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
              Projects
            </div>
            <div className="space-y-0.5">
              {projects.slice(0, 8).map((p) => {
                const active = activeProjectId === p.id;
                return (
                  <Link
                    key={p.id}
                    href={`/project/${p.id}/planner`}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] rounded-lg text-left truncate
                      ${active ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-300'}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div className="px-2 pb-3 space-y-0.5 relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left"
        >
          <Avatar user={{ name: firstName, email: user.email }} size={28} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-white truncate">{user.name ?? firstName}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{user.email}</div>
          </div>
          <Icon.Chev className="w-3.5 h-3.5 text-slate-500 -rotate-90 shrink-0" />
        </button>

        {menuOpen && (
          <div className="absolute left-2 right-2 bottom-14 rounded-xl bg-slate-800 border border-white/10 shadow-lift py-1 text-[13px] z-50">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
