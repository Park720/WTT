'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useTimer } from '@/components/TimerProvider';
import { formatMinutes } from '@/lib/format';

const DIAL = 300;
const STROKE = 10;
const TOTAL_SESSIONS = 8;

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

// Precompute tick geometry once and round to 3 decimals so Node and browser
// implementations of Math.sin/cos can't desync in the 12th+ decimal and
// trigger a hydration mismatch on these SVG attributes.
const TICK_RADIUS = (DIAL - STROKE * 2) / 2 - 2;
const TICK_CX = DIAL / 2;
const TICK_CY = DIAL / 2;
const round3 = (n) => Math.round(n * 1000) / 1000;
const DIAL_TICKS = Array.from({ length: 60 }, (_, i) => {
  const ang = (i / 60) * 2 * Math.PI - Math.PI / 2;
  const long = i % 5 === 0;
  const outer = TICK_RADIUS + (long ? 6 : 4);
  const inner = TICK_RADIUS + (long ? 12 : 10);
  return {
    x1: round3(TICK_CX + Math.cos(ang) * inner),
    y1: round3(TICK_CY + Math.sin(ang) * inner),
    x2: round3(TICK_CX + Math.cos(ang) * outer),
    y2: round3(TICK_CY + Math.sin(ang) * outer),
    long,
  };
});

function DialTicks() {
  return (
    <g>
      {DIAL_TICKS.map((t, i) => (
        <line
          key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="#cbd5e1"
          strokeWidth={t.long ? 1.5 : 0.8}
        />
      ))}
    </g>
  );
}

export default function TimerClient({ project, tasks, preselectTaskId, currentUserId }) {
  const router = useRouter();
  const {
    mode, modes,
    activeSession, running, totalSec, remainingSec, completedSessions,
    heartbeatTick,
    startFocus, pause, resume, reset, skip, changeMode, endSession, addMinutes,
    MIN_TOTAL_SEC, MAX_TOTAL_SEC,
  } = useTimer();

  const [startError, setStartError] = useState('');
  const [taskList, setTaskList] = useState(tasks);
  const preselectHandledRef = useRef(false);
  const lastBumpedTickRef = useRef(0);

  useEffect(() => { setTaskList(tasks); }, [tasks]);

  // Optimistic bump: each heartbeat adds 1 min to the active task's loggedMinutes,
  // so Progress % and the Logged stat animate up live without re-fetching.
  useEffect(() => {
    if (heartbeatTick === 0 || heartbeatTick === lastBumpedTickRef.current) return;
    lastBumpedTickRef.current = heartbeatTick;
    const taskId = activeSession?.taskId;
    if (!taskId) return;
    setTaskList((prev) => prev.map((t) => (
      t.id === taskId
        ? { ...t, loggedMinutes: (t.loggedMinutes ?? 0) + 1 }
        : t
    )));
  }, [heartbeatTick, activeSession]);

  useEffect(() => {
    if (preselectHandledRef.current) return;
    if (!preselectTaskId) { preselectHandledRef.current = true; return; }
    const task = tasks.find((t) => t.id === preselectTaskId);
    if (!task) { preselectHandledRef.current = true; return; }
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
  }, [preselectTaskId]);

  const pinnedTask = useMemo(
    () => (activeSession ? taskList.find((t) => t.id === activeSession.taskId) ?? null : null),
    [activeSession, taskList],
  );

  // Scope stats to the pinned task (with its subtasks) when one is focused,
  // otherwise sum the whole project. Always derived fresh — no stale carry-over.
  const stats = useMemo(() => {
    const sumEst = (rows) => rows.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0);
    const sumLog = (rows) => rows.reduce((n, t) => n + (t.loggedMinutes ?? 0), 0);

    if (pinnedTask) {
      const subs = taskList.filter((t) => !t.isDeleted && t.parentTaskId === pinnedTask.id);
      const scoped = subs.length > 0 ? subs : [pinnedTask];
      const missions = scoped.filter((t) => t.status !== 'DONE').length;
      const estMin = sumEst(scoped);
      const logMin = sumLog(scoped);
      const progressPct = estMin > 0 ? Math.round((logMin / estMin) * 100) : 0;
      return { scope: 'task', missions, progressPct, estMin, logMin };
    }

    const openTasks = taskList.filter((t) => !t.isDeleted);
    const missions = openTasks.filter((t) => t.status !== 'DONE').length;
    const estMin = sumEst(openTasks);
    const logMin = sumLog(openTasks);
    const progressPct = estMin > 0 ? Math.round((logMin / estMin) * 100) : 0;
    return { scope: 'project', missions, progressPct, estMin, logMin };
  }, [taskList, pinnedTask]);

  const upNext = useMemo(() => {
    return taskList
      .filter((t) =>
        !t.isDeleted
        && !t.isBlocked
        && (t.status === 'TODO' || t.status === 'IN_PROGRESS')
        && t.id !== activeSession?.taskId
        && (t.assigneeId === currentUserId || !t.assigneeId),
      )
      .slice(0, 4);
  }, [taskList, activeSession, currentUserId]);

  // Ring represents remaining time: full at start, empty at 0.
  const remainingFrac = totalSec > 0
    ? Math.max(0, Math.min(1, remainingSec / totalSec))
    : 0;
  const r = (DIAL - STROKE * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - remainingFrac);

  // Active sessions in context are owned by the current user by construction
  // (see /api/timer/active), so only clamp on duration bounds.
  const minusDisabled = totalSec <= MIN_TOTAL_SEC;
  const plusDisabled  = totalSec >= MAX_TOTAL_SEC;
  const adjustBtn =
    'w-9 h-9 rounded-full border border-slate-200 bg-transparent text-slate-500 ' +
    'text-[20px] leading-none flex items-center justify-center select-none ' +
    'transition-all duration-150 ' +
    'hover:bg-slate-100 hover:border-slate-300 active:scale-[0.96] ' +
    'disabled:opacity-30 disabled:cursor-not-allowed ' +
    'disabled:hover:bg-transparent disabled:hover:border-slate-200 ' +
    'disabled:active:scale-100';

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
                <div className="mt-2 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => addMinutes(-5)}
                    disabled={minusDisabled}
                    aria-label="Subtract 5 minutes"
                    className={adjustBtn}
                  >
                    {'−'}
                  </button>
                  <div className="font-mono text-[72px] font-semibold leading-none tabular-nums text-slate-900">
                    {mm}:{ss}
                  </div>
                  <button
                    type="button"
                    onClick={() => addMinutes(5)}
                    disabled={plusDisabled}
                    aria-label="Add 5 minutes"
                    className={adjustBtn}
                  >
                    +
                  </button>
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

            {activeSession && (
              <div className="mt-4 w-full max-w-[320px]">
                <div className="h-px bg-slate-200 mb-4" />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => endSession({ markDone: false })}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    End session
                  </button>
                  <button
                    type="button"
                    onClick={() => endSession({ markDone: true })}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 hover:shadow-lift disabled:opacity-50 transition-all inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon.Check className="w-3.5 h-3.5" /> End &amp; mark done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

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

          <div>
            <div className="mb-2 px-1 text-[10.5px] uppercase tracking-wider font-medium text-slate-400">
              {stats.scope === 'task' ? 'This task' : 'Project totals'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Missions remaining" value={stats.missions}               unit="tasks" tone="amber" />
              <StatCard label="Progress"           value={stats.progressPct}            unit="%"     tone="brand" />
              <StatCard label="Estimated"          value={formatMinutes(stats.estMin)}               tone="slate" />
              <StatCard label="Logged"             value={formatMinutes(stats.logMin)}               tone="emerald" />
            </div>
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
                        {t.estimatedMinutes ? formatMinutes(t.estimatedMinutes) : '—'}
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
