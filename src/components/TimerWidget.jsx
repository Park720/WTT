'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTimer } from '@/components/TimerProvider';
import { Icon } from '@/components/ui';

export default function TimerWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { running, remainingSec, activeSession, mode, modes } = useTimer();

  // Hide on the timer page itself (full dial is already there)
  if (pathname && /\/project\/[^/]+\/timer$/.test(pathname)) return null;
  // Only show while a timer is actually counting down
  if (!running) return null;

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');
  const label = activeSession?.taskTitle ?? modes[mode]?.label ?? 'Focus';

  const handleClick = () => {
    if (activeSession?.projectId) {
      router.push(`/project/${activeSession.projectId}/timer`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Open timer"
      className="fixed z-40 bottom-5 right-5 flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-slate-900 text-white shadow-lift-lg hover:-translate-y-0.5 transition-all"
    >
      <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500">
        <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-40" />
        <Icon.Timer className="w-4 h-4 text-white relative" />
      </span>
      <div className="flex flex-col items-start leading-none">
        <span className="font-mono text-[15px] tabular-nums">{mm}:{ss}</span>
        <span className="text-[10px] text-slate-400 mt-0.5 max-w-[140px] truncate">{label}</span>
      </div>
    </button>
  );
}
