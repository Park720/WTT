'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useMemo, useState, useEffect } from 'react';
import { Avatar, Icon, Logo } from '@/components/ui';
import { useToast } from '@/components/Toaster';
import styles from './Sidebar.module.css';

const APP_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'Home',     href: '/dashboard' },
  { key: 'calendar',  label: 'Calendar',  icon: 'Calendar', href: '/calendar'  },
  { key: 'planner',   label: 'Planner',   icon: 'List',     project: 'planner' },
  { key: 'pomodoro',  label: 'Pomodoro',  icon: 'Timer',    project: 'timer'   },
];

function NavItem({ icon, label, href, active, disabled, onClick }) {
  const IconCmp = Icon[icon];
  const className = [
    styles.navItem,
    active ? styles.navItemActive : '',
    disabled ? styles.navItemDisabled : '',
  ].filter(Boolean).join(' ');

  const content = (
    <>
      <IconCmp className={styles.navItemIcon} />
      <span className={styles.navItemLabel}>{label}</span>
      {active && <span className={styles.activeDot} />}
    </>
  );

  if (disabled || !href) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        disabled={disabled}
        title={disabled ? 'Open a project to access this view' : undefined}
      >
        {content}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default function Sidebar({ user, projects = [] }) {
  const pathname = usePathname();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

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
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Link href="/dashboard">
          <Logo size={16} dark />
        </Link>
      </div>

      <div className={styles.searchWrap}>
        <button type="button" onClick={handleSearchClick} className={styles.searchButton}>
          <Icon.Search className={styles.navItemIcon} style={{ width: 14, height: 14 }} />
          <span className={styles.searchLabel}>Search</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
      </div>

      <nav className={`${styles.nav} nice-scroll`}>
        {navItems.map(({ key, ...rest }) => (
          <NavItem key={key} {...rest} />
        ))}

        {projects.length > 0 && (
          <>
            <div className={styles.sectionTitle}>Projects</div>
            <div className={styles.projectList}>
              {projects.slice(0, 8).map((p) => {
                const active = activeProjectId === p.id;
                return (
                  <Link
                    key={p.id}
                    href={`/project/${p.id}/planner`}
                    className={`${styles.projectItem}${active ? ` ${styles.projectItemActive}` : ''}`}
                  >
                    <span className={styles.projectDot} style={{ background: p.color }} />
                    <span className={styles.projectName}>{p.name}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div className={styles.footer}>
        <button type="button" onClick={() => setMenuOpen((o) => !o)} className={styles.userButton}>
          <Avatar user={{ name: firstName, email: user.email }} size={28} />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name ?? firstName}</div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>
          <Icon.Chev className={styles.chev} />
        </button>

        {menuOpen && (
          <div className={styles.menu}>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className={styles.menuItem}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
