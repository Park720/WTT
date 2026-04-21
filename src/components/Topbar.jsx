'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui';
import NotificationsBell from '@/components/NotificationsBell';

const TITLES = [
  { match: /^\/dashboard/,                          label: 'Dashboard' },
  { match: /^\/project\/[^/]+\/planner/,            label: 'Planner' },
  { match: /^\/project\/[^/]+\/calendar/,           label: 'Calendar' },
  { match: /^\/project\/[^/]+\/timer/,              label: 'Pomodoro' },
  { match: /^\/bin/,                                label: 'Bin' },
];

export default function Topbar({ crumb }) {
  const pathname = usePathname();
  const label = crumb ?? TITLES.find((t) => t.match.test(pathname))?.label ?? 'WhatTheTxxk';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="h-14 px-6 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">WhatTheTxxk</span>
          <Icon.Chev className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-900">{label}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
