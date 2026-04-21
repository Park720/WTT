'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useTimer } from '@/components/TimerProvider';

const DIAL = 300;
const STROKE = 10;
const TOTAL_SESSIONS = 8;

function hours(mins) {
  if (!mins) return 0;
  return Math.round((mins / 60) * 10) / 10;
}

function StatCard({ label, value, unit, tone = 'slate' }) {
  const tones = {
    brand:   'text-orange-600',
    emerald: 'text-emerald-600',
    amber:   'text-amber-600',
    slate:   'text-slate-800',
  };
  return (
    <div className="rounded-2xl border bg-white border-slate-200 p-4">
      <div className="text-[10.5px] uppercase tracking-wider font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`font-mono text-[28px] font-semibold tabular-nums ${tones[tone]}`}>{value}</span>
        {unit && <span className="text-[12px] text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

// SVG tick marks — 60 ticks, longer every 5
function DialTicks() {
  const r = (DIAL - STROKE * 2) / 2 - 2;
  const cx = DIAL / 2;
  const cy = DIAL / 2;
  return (
    <g>
      {Array.from({ length: 60 }, (_, i) => {
        const ang = (i / 60) * 2 * Math.PI - Math.PI / 2;
        const long = i % 5 === 0;
        const outer = r + (long ? 6 : 4);
        const inner = r + (long ? 12 : 10);
        const x1 = cx + Math.cos(ang) * inner;
        const y1 = cy + Math.sin(ang) * inner;
        const x2 = cx + Math.cos(ang) * outer;
        const y2 = cy + Math.sin(ang) * outer;
        return (
          <line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#cbd5e1"
            strokeWidth={long ? 1.5 : 0.8}
          />
        );
      })}
    </g>
  );
}

export default function TimerClient({ project, tasks, preselectTaskId, currentUserId }) {
  const router = useRouter();
  const {
    mode, modes,
    activeSession, running, remainingSec, completedSessions,
    startFocus, pause, resume, reset, skip, changeMode, endSession,
  } = useTimer();

  const [startError, setStartError] = useState('');
  const preselectHandledRef = useRef(false);

  // If the URL has ?task=X, start a focus session on it (unless one is already active for that task).
  useEffect(() => {
    if (preselectHandledRef.current) return;
    if (!preselectTaskId) { preselectHandledRef.current = true; return; }
    const task = tasks.find((t) => t.id === preselectTaskId);
    if (!task) { preselectHandledRef.current = true; return; }
    // Already focused on this task — don't restart
    if (activeSession?.taskId === preselectTaskId) {
      preselectHandledRef.current = true;
      return;
    }
    preselectHandledRef.current = true;
    (async () => {
      try {
        await startFocus({ id: task.id, title: task.title, projectId: project.id });
      } catch (err) {
        setStartError(err.message || 'Could not start focus session');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectTaskId]);

  const pinnedTask = useMemo(
    () => (activeSession ? tasks.find((t) => t.id === activeSession.taskId) ?? null : null),
    [activeSession, tasks],
  );

  // Derived stats
  const stats = useMemo(() => {
    const openTasks = tasks.filter((t) => !t.isDeleted);
    const missions = openTasks.filter((t) => t.status !== 'DONE').length;
    const estMin = openTasks.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0);
    const logMin = openTasks.reduce((n, t) => n + (t.loggedMinutes ?? 0), 0);
    const progressPct = estMin > 0 ? Math.round((logMin / estMin) * 100) : 0;
    return {
      missions,
      progressPct,
      estHours: hours(estMin),
      logHours: hours(logMin),
    };
  }, [tasks]);

  const upNext = useMemo(() => {
    return tasks
      .filter((t) =>
        !t.isDeleted
        && !t.isBlocked
        && (t.status === 'TODO' || t.status === 'IN_PROGRESS')
        && t.id !== activeSession?.taskId
        && (t.assigneeId === currentUserId || !t.assigneeId),
      )
      .slice(0, 4);
  }, [tasks, activeSession, currentUserId]);

  // Dial maths
  const totalSec = modes[mode].minutes * 60;
  const pct = totalSec > 0 ? 100 * (1 - remainingSec / totalSec) : 0;
  const r = (DIAL - STROKE * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');

  const focusedTitle = activeSession?.taskTitle ?? pinnedTask?.title ?? 'No task pinned';
  const focusedSubtitle = pinnedTask?.status ?? (activeSession ? 'Focus' : 'Pick a task to start');

  // Handlers
  const handlePlayPause = () => {
    if (running) { pause(); return; }
    if (remainingSec === 0) { reset(); return; }
    resume();
  };

  const handlePickTask = () => {
    router.push(`/project/${project.id}/planner`);
  };

  return (
    <div className="px-6 py-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Pomodoro <span className="text-slate-400">· {project.name}</span>
          </h1>
          <div className="text-[12px] font-mono mt-0.5 text-slate-500">
            Session {completedSessions + 1}/{TOTAL_SESSIONS} · focused on{' '}
            <span className="text-orange-600">{focusedTitle}</span>
          </div>
        </div>
        <div className="flex items-center p-1 rounded-xl bg-slate-100">
          {Object.entries(modes).map(([k, m]) => (
            <button
              key={k}
              type="button"
              onClick={() => changeMode(k)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors
                ${mode === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {startError && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12.5px] text-red-600">
          {startError}
        </div>
      )}

      <div className="grid lg:grid-cols-[auto_1fr] gap-8">
        {/* ── Dial card ──────────────────────────────────────────────── */}
        <div className="rounded-3xl border bg-white border-slate-200 p-10 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
          <div className="relative flex flex-col items-center">
            <div style={{ width: DIAL, height: DIAL }} className="relative">
              <svg width={DIAL} height={DIAL} className="-rotate-90 absolute inset-0">
                <defs>
                  <linearGradient id="dialG" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#fb923c" />
                    <stop offset="1" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <circle
                  cx={DIAL / 2} cy={DIAL / 2} r={r}
                  fill="none" stroke="#f1f5f9" strokeWidth={STROKE}
                />
                <circle
                  cx={DIAL / 2} cy={DIAL / 2} r={r}
                  fill="none" stroke="url(#dialG)" strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <DialTicks />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[11px] uppercase tracking-[0.16em] font-medium text-slate-500">
                  {modes[mode].label}
                </div>
                <div className="font-mono text-[72px] font-semibold leading-none mt-2 tabular-nums text-slate-900">
                  {mm}:{ss}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-mono text-slate-500">
                  {running ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Running
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Paused
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="w-12 h-12 rounded-full flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Reset"
              >
                <Icon.Reset className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePlayPause}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 shadow-lift"
                aria-label={running ? 'Pause' : 'Play'}
              >
                {running ? <Icon.Pause className="w-6 h-6" /> : <Icon.Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={skip}
                className="w-12 h-12 rounded-full flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Skip"
              >
                <Icon.Skip className="w-4 h-4" />
              </button>
            </div>

            {/* Session dots */}
            <div className="mt-6 flex items-center gap-1.5">
              {Array.from({ length: TOTAL_SESSIONS }, (_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < completedSessions ? 'bg-orange-500' : 'bg-slate-200'
                  }`}
                />
              ))}
              <span className="ml-2 font-mono text-[11px] text-slate-500">
                {completedSessions}/{TOTAL_SESSIONS} sessions today
              </span>
            </div>

            {/* End session button (only when a DB session exists) */}
            {activeSession && (
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => endSession({ markDone: false })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-[12px] font-medium hover:bg-slate-50"
                >
                  End session
                </button>
                <button
                  type="button"
                  onClick={() => endSession({ markDone: true })}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[12px] font-medium hover:bg-emerald-600 inline-flex items-center gap-1.5"
                >
                  <Icon.Check className="w-3.5 h-3.5" /> End &amp; mark done
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats panel ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 inline-flex items-center justify-center text-[18px]">🎯</span>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider font-medium text-slate-500">Focused on</div>
                <div className="text-[14.5px] font-semibold truncate text-slate-900">{focusedTitle}</div>
                <div className="text-[11.5px] font-mono text-slate-500 mt-0.5">{focusedSubtitle}</div>
              </div>
              <button
                type="button"
                onClick={handlePickTask}
                className="ml-auto text-[12px] font-medium px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Change
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Missions remaining" value={stats.missions}    unit="tasks" tone="amber" />
            <StatCard label="Progress"           value={stats.progressPct} unit="%"     tone="brand" />
            <StatCard label="Estimated"          value={stats.estHours}    unit="h"     tone="slate" />
            <StatCard label="Logged"             value={stats.logHours}    unit="h"     tone="emerald" />
          </div>

          <div className="rounded-2xl border bg-white border-slate-200 p-5">
            <div className="text-[11px] uppercase tracking-wider font-medium mb-3 text-slate-500">Up next</div>
            {upNext.length === 0 ? (
              <p className="text-[12.5px] text-slate-400 italic">Nothing queued up for you right now.</p>
            ) : (
              <ul className="rt-none space-y-1">
                {upNext.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/project/${project.id}/planner?task=${t.id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span className="text-[13px] text-slate-800 truncate">{t.title}</span>
                      <span className="ml-auto font-mono text-[11px] text-slate-400">
                        {t.estimatedMinutes ? `${hours(t.estimatedMinutes)}h` : '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
