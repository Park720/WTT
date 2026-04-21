'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui';
import NotificationsBell from '@/components/NotificationsBell';
import styles from './Topbar.module.css';

const TITLES = [
  { match: /^\/dashboard/,                label: 'Dashboard' },
  { match: /^\/project\/[^/]+\/planner/,  label: 'Planner' },
  { match: /^\/project\/[^/]+\/calendar/, label: 'Calendar' },
  { match: /^\/project\/[^/]+\/timer/,    label: 'Pomodoro' },
  { match: /^\/bin/,                      label: 'Bin' },
];

export default function Topbar({ crumb }) {
  const pathname = usePathname();
  const label = crumb ?? TITLES.find((t) => t.match.test(pathname))?.label ?? 'WhatTheTxxk';

  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <div className={styles.crumbs}>
          <span className={styles.crumbRoot}>WhatTheTxxk</span>
          <Icon.Chev className={styles.chev} />
          <span className={styles.crumbCurrent}>{label}</span>
        </div>
        <div className={styles.actions}>
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
