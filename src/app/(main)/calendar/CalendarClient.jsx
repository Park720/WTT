'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Icon, PriorityDot, StatusPill } from '@/components/ui';
import styles from './CalendarClient.module.css';

const VIEWS        = ['Day', 'Week', 'Month'];
const DOW_LABELS   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOUR_START   = 8;
const HOUR_END     = 19;
const HOURS        = HOUR_END - HOUR_START;
const ROW_H        = 48;
const MAX_LANES    = 3;
const LANE_H       = 20;
const TOP_OFFSET   = 28;

// ── Pure helpers ────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  const clean = (hex || '#3b82f6').replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

function startOfWeekLocal(d) {
  const x = new Date(d);
  const dow = x.getDay();
  const fromMon = dow === 0 ? 6 : dow - 1;
  x.setDate(x.getDate() - fromMon);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameWeek(a, b) {
  return startOfWeekLocal(a).getTime() === startOfWeekLocal(b).getTime();
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatWeekLabel(anchor) {
  const ws = startOfWeekLocal(anchor);
  const we = addDays(ws, 6);
  const sMon = ws.toLocaleDateString('en-US', { month: 'short' });
  const eMon = we.toLocaleDateString('en-US', { month: 'short' });
  const year = we.getFullYear();
  if (sMon === eMon) return `${sMon} ${ws.getDate()}–${we.getDate()}, ${year}`;
  return `${sMon} ${ws.getDate()} – ${eMon} ${we.getDate()}, ${year}`;
}

function formatMonthLabel(anchor) {
  return anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getWeekRange(anchor) {
  const start = startOfWeekLocal(anchor);
  const end = addDays(start, 7);
  return { start, end };
}

function getMonthGridRange(anchor) {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const gridStart  = startOfWeekLocal(monthStart);
  const last       = addDays(monthEnd, -1);
  const lastDow    = last.getDay();
  const toSun      = lastDow === 0 ? 0 : 7 - lastDow;
  const gridEnd    = addDays(last, toSun + 1);
  gridEnd.setHours(0, 0, 0, 0);
  return { start: gridStart, end: gridEnd, monthStart, monthEnd };
}

function projectMark(name) {
  return (name?.[0] ?? '?').toUpperCase();
}

// ── Week view event math ────────────────────────────────────────────

const MIN_CARD_H       = 44;
const PROJECT_THRESH   = 60;   // tile height at which the project row fits
const META_THRESH      = 88;   // tile height at which the status+avatar row fits
const MAX_WEEK_LANES   = 3;

function mapTaskToEvent(task, weekStart) {
  if (!task?.dueDate) return null;
  const raw = new Date(task.dueDate);

  // A date-only Planner input is serialized as `YYYY-MM-DDT00:00:00.000Z`.
  // Treat it as the user's local calendar day at 09:00 so timezone offsets
  // don't visually shift the task to the previous evening or next morning.
  const isDateOnlyUTC =
    raw.getUTCHours()   === 0 &&
    raw.getUTCMinutes() === 0 &&
    raw.getUTCSeconds() === 0 &&
    raw.getUTCMilliseconds() === 0;

  const due = isDateOnlyUTC
    ? new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate(), 9, 0, 0)
    : raw;

  // Match by calendar day against the 7 visible days, not by ms arithmetic
  // (DST weeks aren't exactly 7 × 86_400_000 ms).
  let dayIdx = -1;
  for (let i = 0; i < 7; i++) {
    if (sameDay(due, addDays(weekStart, i))) { dayIdx = i; break; }
  }
  if (dayIdx < 0) return null;

  const start = due.getHours() + due.getMinutes() / 60;
  const estMinutes = task.estimatedMinutes && task.estimatedMinutes > 0
    ? task.estimatedMinutes
    : 60;
  return { task, day: dayIdx, start, len: estMinutes / 60 };
}

function clipEvent(ev) {
  // Always return a tile so every fetched task is discoverable — if the
  // due time lands outside the visible hours range, snap it to the nearest
  // edge rather than dropping the card.
  const desiredStart = ev.start;
  const desiredEnd   = ev.start + ev.len;

  let s;
  let e;
  if (desiredEnd <= HOUR_START) {
    s = HOUR_START;
    e = HOUR_START + 1;
  } else if (desiredStart >= HOUR_END) {
    s = HOUR_END - 1;
    e = HOUR_END;
  } else {
    s = Math.max(HOUR_START, desiredStart);
    e = Math.min(HOUR_END,   desiredEnd);
  }

  const rawHeight = (e - s) * ROW_H - 2;
  return {
    ...ev,
    top:    (s - HOUR_START) * ROW_H,
    height: Math.max(MIN_CARD_H, rawHeight),
    clippedEnd: e,
  };
}

// Pack overlapping events in each day into lane clusters.
function layoutWeekEvents(events) {
  const byDay = new Map();
  for (const ev of events) {
    const arr = byDay.get(ev.day) ?? [];
    arr.push(ev);
    byDay.set(ev.day, arr);
  }

  const clusters = [];
  for (const dayEvents of byDay.values()) {
    dayEvents.sort((a, b) => a.start - b.start);
    let current = null;
    for (const ev of dayEvents) {
      if (!current || ev.start >= current.end) {
        current = { day: ev.day, events: [], end: 0, clippedEnd: HOUR_START };
        clusters.push(current);
      }
      current.events.push(ev);
      current.end        = Math.max(current.end, ev.start + ev.len);
      current.clippedEnd = Math.max(current.clippedEnd, ev.clippedEnd);
    }
  }

  // Greedy lane assignment per cluster
  for (const c of clusters) {
    const laneEnd = [];
    for (const ev of c.events) {
      let lane = laneEnd.findIndex((e) => e <= ev.start);
      if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
      laneEnd[lane] = ev.start + ev.len;
      ev.lane = lane;
      ev.cluster = c;
    }
    c.lanes        = laneEnd.length;
    c.visibleLanes = Math.min(MAX_WEEK_LANES, c.lanes);
    c.overflow     = c.events.filter((e) => e.lane >= MAX_WEEK_LANES);
  }

  return clusters;
}

function WeekCard({ ev, user, onClick }) {
  const task = ev.task;
  const color = task.project.color;
  const { cluster } = ev;
  const visibleLanes = cluster.visibleLanes;

  const hh = String(Math.floor(ev.start)).padStart(2, '0');
  const mm = String(Math.round((ev.start % 1) * 60)).padStart(2, '0');
  const timeLabel = `${hh}:${mm}`;

  const showProject = ev.height >= PROJECT_THRESH;
  const showMeta    = ev.height >= META_THRESH;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${task.title} · ${task.project.name}`}
      className={styles.weekCard}
      style={{
        left:  `calc(60px + ${ev.day} * ((100% - 60px) / 7) + ${ev.lane} * ((100% - 60px) / 7) / ${visibleLanes} + 3px)`,
        width: `calc(((100% - 60px) / 7) / ${visibleLanes} - 6px)`,
        top:   ev.top,
        height: ev.height,
        background:  hexToRgba(color, 0.12),
        borderLeft:  `3px solid ${color}`,
        '--weekCardHoverBg': hexToRgba(color, 0.20),
      }}
    >
      <div className={styles.weekCardTimeRow}>
        <PriorityDot priority={task.priority} />
        <span className={styles.weekCardTime}>{timeLabel}</span>
      </div>
      <span className={styles.weekCardTitle}>{task.title}</span>
      {showProject && <span className={styles.weekCardProject}>{task.project.name}</span>}
      {showMeta && (
        <div className={styles.weekCardMeta}>
          <StatusPill status={task.status} size="sm" />
          {user && <Avatar user={user} size={14} />}
          {task.isBlocked && <Icon.Lock className={styles.weekCardLock} />}
        </div>
      )}
    </button>
  );
}

function WeekView({ anchor, tasks, now, user, onSelectTask, onMoreClick }) {
  const weekStart = useMemo(() => startOfWeekLocal(anchor), [anchor]);
  const dayCells = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
          date: d,
          dow: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
          day: d.getDate(),
          isToday: sameDay(d, now),
        };
      }),
    [weekStart, now],
  );

  const events = useMemo(() => {
    return tasks
      .map((t) => mapTaskToEvent(t, weekStart))
      .filter(Boolean)
      .map(clipEvent)
      .filter(Boolean);
  }, [tasks, weekStart]);

  const clusters = useMemo(() => layoutWeekEvents(events), [events]);

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const todayDow = now.getDay();
  const todayIdx = todayDow === 0 ? 6 : todayDow - 1;
  const showNowLine = sameWeek(weekStart, now) && nowHour >= HOUR_START && nowHour <= HOUR_END;

  return (
    <div key={`week-${weekStart.getTime()}`} className={`${styles.monthBox} page-enter`}>
      <div className={styles.weekHeader}>
        <div />
        {dayCells.map((d) => (
          <div
            key={d.dow + d.day}
            className={`${styles.weekHeaderCell}${d.isToday ? ` ${styles.weekHeaderToday}` : ''}`}
          >
            <div className={styles.weekHeaderDow}>{d.dow}</div>
            <div className={styles.weekHeaderDay}>{d.day}</div>
          </div>
        ))}
      </div>

      <div className={styles.weekBody} style={{ height: HOURS * ROW_H }}>
        <div className={styles.weekBodyGrid}>
          <div className={styles.weekHours}>
            {Array.from({ length: HOURS }, (_, i) => (
              <div key={i} className={styles.weekHour}>
                {String(HOUR_START + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {dayCells.map((d, di) => (
            <div
              key={di}
              className={`${styles.weekCol}${d.isToday ? ` ${styles.weekColToday}` : ''}`}
            >
              {Array.from({ length: HOURS }, (_, hi) => (
                <div
                  key={hi}
                  className={`${styles.weekCell}${hi % 2 === 1 ? ` ${styles.weekCellOdd}` : ''}`}
                />
              ))}
            </div>
          ))}
        </div>

        {events.map((ev) => {
          if (ev.lane >= MAX_WEEK_LANES) return null;
          return (
            <WeekCard
              key={ev.task.id}
              ev={ev}
              user={user}
              onClick={() => onSelectTask(ev.task)}
            />
          );
        })}

        {clusters.map((c, i) => {
          if (c.overflow.length === 0) return null;
          const topPx = Math.max(0, (c.clippedEnd - HOUR_START) * ROW_H - 20);
          return (
            <button
              key={`more-${i}`}
              type="button"
              onClick={(e) => onMoreClick(e, c.overflow.map((ev) => ({ task: ev.task })))}
              className={styles.weekMore}
              style={{
                left:  `calc(60px + ${c.day} * ((100% - 60px) / 7) + 3px)`,
                width: `calc((100% - 60px) / 7 - 6px)`,
                top:   topPx,
              }}
            >
              +{c.overflow.length} more
            </button>
          );
        })}

        {showNowLine && (
          <div
            className={styles.nowLineWrap}
            style={{
              left: `calc(60px + ${todayIdx} * ((100% - 60px)/7))`,
              top: (nowHour - HOUR_START) * ROW_H,
              width: 'calc((100% - 60px)/7)',
            }}
          >
            <div className={styles.nowLineDot} />
            <div className={styles.nowLineBar} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Month view segments ─────────────────────────────────────────────

function buildMonthGrid(anchor) {
  const { monthStart, monthEnd, start: gridStart, end: gridEnd } = getMonthGridRange(anchor);
  const weeks = [];
  for (let c = new Date(gridStart); c < gridEnd; c = addDays(c, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(c, i)));
  }
  return { monthStart, monthEnd, gridStart, gridEnd, weeks };
}

function buildSegments(tasks, grid) {
  const segments = [];
  for (const t of tasks) {
    const barStart = dayStart(new Date(t.createdAt)).getTime();
    const dueDay   = dayStart(new Date(t.dueDate));
    const barEnd   = dueDay.getTime() + 86400000;

    for (let rowIdx = 0; rowIdx < grid.weeks.length; rowIdx++) {
      const week = grid.weeks[rowIdx];
      const weekStart = week[0].getTime();
      const weekEnd   = week[6].getTime() + 86400000;

      const segStart = Math.max(barStart, weekStart);
      const segEnd   = Math.min(barEnd, weekEnd);
      if (segStart >= segEnd) continue;

      const colStart = Math.round((segStart - weekStart) / 86400000);
      const colSpan  = Math.max(1, Math.round((segEnd - segStart) / 86400000));
      segments.push({
        task: t,
        rowIdx,
        colStart,
        colSpan,
        clippedLeft:  segStart > barStart,
        clippedRight: segEnd   < barEnd,
      });
    }
  }

  const byRow = new Map();
  for (const seg of segments) {
    const arr = byRow.get(seg.rowIdx) ?? [];
    arr.push(seg);
    byRow.set(seg.rowIdx, arr);
  }
  for (const arr of byRow.values()) {
    arr.sort((a, b) => a.colStart - b.colStart);
    const laneEnd = [];
    for (const seg of arr) {
      let lane = laneEnd.findIndex((e) => e <= seg.colStart);
      if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
      laneEnd[lane] = seg.colStart + seg.colSpan;
      seg.lane = lane;
    }
  }
  return segments;
}

function BarSegment({ seg, onClick }) {
  const { task, colStart, colSpan, lane, clippedLeft, clippedRight } = seg;
  const color = task.project.color;
  const leftInset  = clippedLeft  ? 0 : 2;
  const rightInset = clippedRight ? 0 : 2;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${task.title} — ${task.project.name}`}
      className={[
        styles.bar,
        clippedLeft  ? styles.barClipL : '',
        clippedRight ? styles.barClipR : '',
      ].filter(Boolean).join(' ')}
      style={{
        left:  `calc(${(colStart / 7) * 100}% + ${leftInset}px)`,
        width: `calc(${(colSpan / 7) * 100}% - ${leftInset + rightInset}px)`,
        top:   TOP_OFFSET + lane * LANE_H,
        background: hexToRgba(color, 0.3),
        borderLeft: clippedLeft ? `2px solid ${color}cc` : `2px solid ${color}`,
        color,
      }}
    >
      {clippedLeft && <span className={styles.barArrow}>◀</span>}
      <span className={styles.barMark}>{projectMark(task.project.name)}</span>
      <span className={styles.barTitle}>{task.title}</span>
      {clippedRight && <span className={styles.barArrow}>▶</span>}
    </button>
  );
}

function MonthView({ anchor, tasks, now, onSelectTask, onMoreClick }) {
  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const segments = useMemo(() => buildSegments(tasks, grid), [tasks, grid]);

  const segmentsByDay = useMemo(() => {
    const m = new Map();
    for (const seg of segments) {
      for (let c = 0; c < seg.colSpan; c++) {
        const key = seg.rowIdx * 7 + seg.colStart + c;
        const arr = m.get(key) ?? [];
        arr.push(seg);
        m.set(key, arr);
      }
    }
    return m;
  }, [segments]);

  const hiddenByDay = useMemo(() => {
    const counts = new Map();
    for (const seg of segments) {
      if (seg.lane < MAX_LANES) continue;
      for (let c = 0; c < seg.colSpan; c++) {
        const key = seg.rowIdx * 7 + seg.colStart + c;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [segments]);

  return (
    <div key={`month-${grid.monthStart.getTime()}`} className={`${styles.monthBox} page-enter`}>
      <div className={styles.dow}>
        {DOW_LABELS.map((d) => (
          <div key={d} className={styles.dowCell}>{d}</div>
        ))}
      </div>

      {grid.weeks.map((week, rowIdx) => (
        <div key={rowIdx} className={styles.weekRow}>
          <div className={styles.cells}>
            {week.map((d, colIdx) => {
              const inMonth   = d.getMonth() === grid.monthStart.getMonth();
              const isToday   = sameDay(d, now);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const dayKey    = rowIdx * 7 + colIdx;
              const moreCount = hiddenByDay.get(dayKey) ?? 0;
              return (
                <div
                  key={colIdx}
                  className={[
                    styles.cell,
                    !inMonth   ? styles.cellOut     : '',
                    isWeekend  ? styles.cellWeekend : '',
                    isToday    ? styles.cellToday   : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className={[
                    styles.cellDay,
                    !inMonth ? styles.cellDayOut   : '',
                    isToday  ? styles.cellDayToday : '',
                  ].filter(Boolean).join(' ')}>
                    {d.getDate()}
                  </div>
                  {moreCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => onMoreClick(e, segmentsByDay.get(dayKey) ?? [])}
                      className={styles.more}
                    >
                      +{moreCount} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.bars}>
            {segments
              .filter((s) => s.rowIdx === rowIdx && s.lane < MAX_LANES)
              .map((seg, si) => (
                <BarSegment
                  key={`${seg.task.id}-${si}`}
                  seg={seg}
                  onClick={() => onSelectTask(seg.task)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────

export default function CalendarClient({ initialTasks, initialProjects, user }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState('Week');
  const [anchor, setAnchor]     = useState(() => new Date());
  const [tasks, setTasks]       = useState(initialTasks ?? []);
  const [projects, setProjects] = useState(initialProjects ?? []);
  const [hidden, setHidden]     = useState(() => new Set());
  const [more, setMore]         = useState(null);
  const [now, setNow]           = useState(() => new Date());
  const didMountRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    const range = viewMode === 'Week' ? getWeekRange(anchor) : getMonthGridRange(anchor);
    const qs = new URLSearchParams({
      start: range.start.toISOString(),
      end:   range.end.toISOString(),
    });
    let cancel = false;
    (async () => {
      const res = await fetch(`/api/calendar?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok || cancel) return;
      const data = await res.json();
      if (cancel) return;
      setTasks(data.tasks);
      setProjects(data.projects);
      setMore(null);
    })();
    return () => { cancel = true; };
  }, [viewMode, anchor]);

  useEffect(() => {
    if (!more) return;
    const close = () => setMore(null);
    const onKey = (e) => { if (e.key === 'Escape') setMore(null); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [more]);

  const visibleTasks = useMemo(
    () => tasks.filter((t) => !hidden.has(t.project.id)),
    [tasks, hidden],
  );

  const taskCount = visibleTasks.length;
  const projectCount = useMemo(
    () => new Set(visibleTasks.map((t) => t.project.id)).size,
    [visibleTasks],
  );

  const navLabel    = viewMode === 'Week' ? formatWeekLabel(anchor) : formatMonthLabel(anchor);
  const isOnCurrent = viewMode === 'Week' ? sameWeek(anchor, now)  : sameMonth(anchor, now);

  const kpis = useMemo(() => {
    const startOfToday = dayStart(now).getTime();
    const endOfToday   = startOfToday + 86400000;
    const overdue = visibleTasks.filter((t) => {
      const due = new Date(t.dueDate).getTime();
      return due < startOfToday && t.status !== 'DONE';
    }).length;

    if (viewMode === 'Week') {
      const ws = startOfWeekLocal(anchor).getTime();
      const we = ws + 7 * 86400000;
      const thisWeek = visibleTasks.filter((t) => {
        const due = new Date(t.dueDate).getTime();
        return due >= ws && due < we;
      }).length;
      const dueToday = visibleTasks.filter((t) => {
        const due = new Date(t.dueDate).getTime();
        return due >= startOfToday && due < endOfToday && t.status !== 'DONE';
      }).length;
      return { primary: ['This week', thisWeek], secondary: ['Due today', dueToday], overdue };
    }

    const dueThisWeek = visibleTasks.filter((t) => {
      const due = new Date(t.dueDate).getTime();
      return due >= startOfToday && due < startOfToday + 7 * 86400000 && t.status !== 'DONE';
    }).length;
    return {
      primary: ['This month', visibleTasks.length],
      secondary: ['Due this week', dueThisWeek],
      overdue,
    };
  }, [viewMode, visibleTasks, anchor, now]);

  const handlePrev = () => {
    if (viewMode === 'Week') setAnchor((a) => addDays(a, -7));
    else setAnchor((a) => addMonths(a, -1));
  };
  const handleNext = () => {
    if (viewMode === 'Week') setAnchor((a) => addDays(a, 7));
    else setAnchor((a) => addMonths(a, 1));
  };
  const handleToday = () => setAnchor(new Date());

  const toggleProject = (id) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openTask = (task) => {
    setMore(null);
    const projectId = task.projectId ?? task.project.id;
    router.push(`/project/${projectId}/planner?task=${task.id}`);
  };

  const handleMoreClick = (e, segs) => {
    e.stopPropagation();
    const items = segs.map((s) => s.task);
    if (items.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMore({
      items,
      anchor: {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      },
    });
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <div className={styles.subtitle}>
            {projectCount} {projectCount === 1 ? 'project' : 'projects'} · {taskCount} of my {taskCount === 1 ? 'task' : 'tasks'}
          </div>
        </div>
        <div className={styles.nav}>
          <div className={styles.viewPill}>
            {VIEWS.map((v) => {
              const enabled = v === 'Week' || v === 'Month';
              const active = viewMode === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => enabled && setViewMode(v)}
                  disabled={!enabled}
                  title={!enabled ? `${v} view coming soon` : undefined}
                  className={[
                    styles.viewBtn,
                    active  ? styles.viewBtnActive   : '',
                    !enabled ? styles.viewBtnDisabled : '',
                  ].filter(Boolean).join(' ')}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div className={styles.navPill}>
            <button
              type="button"
              onClick={handlePrev}
              className={styles.navBtn}
              aria-label={viewMode === 'Week' ? 'Previous week' : 'Previous month'}
            >
              <Icon.Chev className={styles.navChev} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div className={styles.monthLabel}>{navLabel}</div>
            <button
              type="button"
              onClick={handleNext}
              className={styles.navBtn}
              aria-label={viewMode === 'Week' ? 'Next week' : 'Next month'}
            >
              <Icon.Chev className={styles.navChev} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleToday}
            disabled={isOnCurrent}
            className={styles.todayBtn}
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      {projects.length > 0 && (
        <div className={styles.legend}>
          {projects.map((p) => {
            const isHidden = hidden.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProject(p.id)}
                className={`${styles.legendChip}${isHidden ? ` ${styles.legendChipMuted}` : ''}`}
                style={{
                  borderColor: isHidden ? 'var(--slate-200)' : hexToRgba(p.color, 0.35),
                  color: isHidden ? 'var(--slate-400)' : p.color,
                  background: isHidden ? 'var(--slate-50)' : hexToRgba(p.color, 0.08),
                }}
              >
                <span className={styles.legendDot} style={{ background: p.color }} />
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      {viewMode === 'Week' ? (
        <WeekView
          anchor={anchor}
          tasks={visibleTasks}
          now={now}
          user={user}
          onSelectTask={openTask}
          onMoreClick={handleMoreClick}
        />
      ) : (
        <MonthView
          anchor={anchor}
          tasks={visibleTasks}
          now={now}
          onSelectTask={openTask}
          onMoreClick={handleMoreClick}
        />
      )}

      {/* KPIs */}
      <div className={styles.footer}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>{kpis.primary[0]}</div>
          <div className={styles.kpiValue}>{kpis.primary[1]}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>{kpis.secondary[0]}</div>
          <div className={styles.kpiValue}>{kpis.secondary[1]}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Overdue</div>
          <div className={styles.kpiValue}>{kpis.overdue}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Active projects</div>
          <div className={styles.kpiValue}>{projectCount}</div>
        </div>
      </div>

      {/* +N more popover */}
      {more && (
        <div
          className={styles.moreDropdown}
          style={{ top: more.anchor.top, left: more.anchor.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {more.items.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => openTask(task)}
              className={styles.moreItem}
            >
              <span className={styles.moreDot} style={{ background: task.project.color }} />
              <span className={styles.moreItemTitle}>{task.title}</span>
              <span className={styles.moreItemProject}>{task.project.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
