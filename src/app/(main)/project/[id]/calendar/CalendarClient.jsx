'use client';

import { useState, useMemo, useEffect } from 'react';
import { Avatar, Icon, STATUS } from '@/components/ui';
import TaskDetailModal from '@/components/TaskDetailModal';

const HOUR_START = 8;
const HOUR_END   = 19;
const HOURS      = HOUR_END - HOUR_START;
const ROW_H      = 48;
const VIEWS      = ['Day', 'Week', 'Month'];


function startOfWeek(offset = 0) {
  const d = new Date();
  const dow = d.getDay();              // 0=Sun … 6=Sat
  const fromMon = dow === 0 ? 6 : dow - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - fromMon + offset * 7);
  return d;
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

function formatWeekLabel(weekStart) {
  const end = addDays(weekStart, 6);
  const sMon = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const eMon = end.toLocaleDateString('en-US', { month: 'short' });
  const year = weekStart.getFullYear();
  if (sMon === eMon) {
    return `${sMon} ${weekStart.getDate()}–${end.getDate()}, ${year}`;
  }
  return `${sMon} ${weekStart.getDate()} – ${eMon} ${end.getDate()}, ${year}`;
}

function mapTaskToEvent(task, weekStart) {
  const due = new Date(task.dueDate);
  const dayIdx = Math.floor((new Date(due.getFullYear(), due.getMonth(), due.getDate()) - weekStart) / 86400000);
  if (dayIdx < 0 || dayIdx > 6) return null;

  const h = due.getHours();
  const m = due.getMinutes();
  const hasTime = h !== 0 || m !== 0;
  const start = hasTime ? h + m / 60 : 9;

  const len = (task.estimatedMinutes ?? 60) / 60;

  return { task, day: dayIdx, start, len };
}

function clipEvent(ev) {
  const end = ev.start + ev.len;
  if (end <= HOUR_START || ev.start >= HOUR_END) return null;
  const s = Math.max(ev.start, HOUR_START);
  const e = Math.min(end, HOUR_END);
  return { ...ev, top: (s - HOUR_START) * ROW_H, height: Math.max(22, (e - s) * ROW_H - 4) };
}

function EventTile({ ev, onClick }) {
  const task = ev.task;
  const st = STATUS[task.status] ?? STATUS.TODO;
  const startLabel = `${String(Math.floor(ev.start)).padStart(2, '0')}:${String(Math.round((ev.start % 1) * 60)).padStart(2, '0')}`;

  return (
    <div
      className="absolute"
      style={{
        left: `calc(60px + ${ev.day} * ((100% - 60px)/7) + 4px)`,
        width: `calc((100% - 60px)/7 - 8px)`,
        top: ev.top,
        height: ev.height,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="h-full w-full text-left rounded-lg p-2 text-[11.5px] leading-tight border overflow-hidden relative hover:shadow-sm transition-shadow"
        style={{
          background: `${st.swatch}1a`,
          borderColor: `${st.swatch}66`,
          color: '#0f172a',
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: st.swatch }} />
        <div className="pl-1.5 flex items-center gap-1 mb-0.5">
          {task.assignee && <Avatar user={task.assignee} size={14} />}
          <span className="font-mono text-[9.5px] opacity-70">{startLabel}</span>
        </div>
        <div className="pl-1.5 font-medium truncate">{task.title}</div>
        {ev.height > 60 && (
          <div className="pl-1.5 mt-1">
            <span className="inline-flex items-center gap-1 text-[9.5px] opacity-75">
              <span>{st.icon}</span> {st.label}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

export default function CalendarClient({ project, tasks: initialTasks }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState('Week');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [now, setNow] = useState(() => new Date());

  async function refresh() {
    const res = await fetch(`/api/projects/${project.id}/tasks`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks.filter((t) => t.dueDate));
    }
  }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const weekStart = useMemo(() => startOfWeek(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

  const dayCells = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
          date: d,
          dow: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
          day: d.getDate(),
          isToday: weekOffset === 0 && sameDay(d, now),
        };
      }),
    [weekStart, now, weekOffset],
  );

  const events = useMemo(() => {
    return tasks
      .map((t) => mapTaskToEvent(t, weekStart))
      .filter(Boolean)
      .map(clipEvent)
      .filter(Boolean);
  }, [tasks, weekStart]);

  const statusCounts = useMemo(() => {
    const counts = { TODO: 0, IN_PROGRESS: 0, PENDING_REVIEW: 0, DONE: 0, BLOCKED: 0 };
    for (const ev of events) {
      const s = ev.task.isBlocked ? 'BLOCKED' : ev.task.status;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const todayDow = now.getDay();
  const todayIdx = todayDow === 0 ? 6 : todayDow - 1;
  const showNowLine = weekOffset === 0 && nowHour >= HOUR_START && nowHour <= HOUR_END;

  return (
    <div className="px-6 py-5 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Calendar <span className="text-slate-400">· {project.name}</span>
          </h1>
          <div className="text-[12px] font-mono mt-0.5 text-slate-500">
            team view · {events.length} scheduled
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors
                  ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                disabled={v !== 'Week'}
                title={v !== 'Week' ? `${v} view coming soon` : undefined}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Previous week"
            >
              <Icon.Chev className="w-3.5 h-3.5 rotate-180" />
            </button>
            <div className="px-3 py-1.5 font-mono text-[12px] border-x border-slate-200 text-slate-700">
              {weekLabel}
            </div>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Next week"
            >
              <Icon.Chev className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
            className="px-3 py-1.5 rounded-lg text-[12.5px] border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap mb-3">
        {Object.values(STATUS).map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11.5px]">
            <span className="w-2 h-2 rounded-full" style={{ background: s.swatch }} />
            <span className="text-slate-500">{s.label}</span>
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="border-b border-r border-slate-200" />
          {dayCells.map((d) => (
            <div
              key={d.dow + d.day}
              className={`py-2.5 px-3 text-center border-b border-r last:border-r-0 border-slate-200 ${d.isToday ? 'bg-orange-50' : ''}`}
            >
              <div className={`text-[10.5px] font-medium uppercase tracking-[0.12em] ${d.isToday ? 'text-orange-600' : 'text-slate-500'}`}>
                {d.dow}
              </div>
              <div className={`font-mono text-[18px] mt-0.5 ${d.isToday ? 'text-orange-600' : 'text-slate-900'}`}>
                {d.day}
              </div>
            </div>
          ))}
        </div>

        <div key={weekOffset} className="relative page-enter" style={{ height: HOURS * ROW_H }}>
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="flex flex-col">
              {Array.from({ length: HOURS }, (_, i) => (
                <div
                  key={i}
                  className="h-[48px] px-2 text-right font-mono text-[10px] text-slate-400 pt-0.5 border-r border-slate-200"
                >
                  {String(HOUR_START + i).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {dayCells.map((d, di) => (
              <div
                key={di}
                className={`relative border-r last:border-r-0 border-slate-200 ${d.isToday ? 'bg-orange-50/30' : ''}`}
              >
                {Array.from({ length: HOURS }, (_, hi) => (
                  <div
                    key={hi}
                    className={`h-[48px] border-b border-slate-100 ${hi % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {events.map((ev) => (
            <EventTile
              key={ev.task.id}
              ev={ev}
              onClick={() => setSelectedTaskId(ev.task.id)}
            />
          ))}

          {showNowLine && (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                left: `calc(60px + ${todayIdx} * ((100% - 60px)/7))`,
                top: (nowHour - HOUR_START) * ROW_H,
                width: 'calc((100% - 60px)/7)',
                height: 2,
              }}
            >
              <div className="relative h-full">
                <div className="absolute left-0 -top-1 w-3 h-3 rounded-full bg-orange-500 ring-2 ring-white" />
                <div className="h-[2px] now-line" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-4 gap-3">
        {[
          { label: 'Scheduled',      value: events.length },
          { label: 'In progress',    value: statusCounts.IN_PROGRESS },
          { label: 'Pending review', value: statusCounts.PENDING_REVIEW },
          { label: 'Blocked',        value: statusCounts.BLOCKED },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl p-3 border bg-white border-slate-200">
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500">{kpi.label}</div>
            <div className="font-mono text-[20px] mt-0.5 text-slate-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          projectId={project.id}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onChange={refresh}
        />
      )}
    </div>
  );
}
