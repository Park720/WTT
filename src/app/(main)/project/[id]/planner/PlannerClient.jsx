'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Avatar, AvatarStack, StatusPill, PriorityDot, Tag, ProgressBar, CircularProgress,
  Checkbox, Icon,
  STATUS,
} from '@/components/ui';
import MembersModal from '@/components/MembersModal';
import NewTaskModal from '@/components/NewTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { useToast } from '@/components/Toaster';
import { formatMinutes, isDateOnlyDueDate } from '@/lib/format';

const TIME_FILTERS = ['Today', 'Week', 'Month'];

function formatDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isDateOnlyDueDate(d)) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

function truncate(s, n = 22) {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function countSubtasksDone(task) {
  const done = task.subtasks.filter((s) => s.status === 'DONE').length;
  return { done, total: task.subtasks.length };
}

const stopThen = (fn) => (e) => { e.stopPropagation(); return fn(e); };

const keyboardClick = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
};

function ManagerCard({ t, onApprove, onReject, onBin, onAddSubtask, onOpenTask, isOwner }) {
  const { done, total } = countSubtasksDone(t);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const unfinished = t.subtasks.filter((s) => s.status !== 'DONE');
  const pending = t.subtasks.filter((s) => s.status === 'PENDING_REVIEW');
  const assigneeIds = [...new Set(t.subtasks.map((s) => s.assigneeId).filter(Boolean))];
  const assignees = assigneeIds.map((id) => t.subtasks.find((s) => s.assigneeId === id)?.assignee).filter(Boolean);
  const estMin = t.subtasks.reduce((n, s) => n + (s.estimatedMinutes ?? 0), 0);
  const logMin = t.subtasks.reduce((n, s) => n + (s.loggedMinutes ?? 0), 0);

  const openSelf = () => onOpenTask(t.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openSelf}
      onKeyDown={keyboardClick(openSelf)}
      className="rounded-2xl border p-5 hover-lift bg-white border-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="flex items-start gap-4">
        <CircularProgress
          value={pct} size={56} stroke={5}
          label={`${pct}%`} sub={`${done}/${total}`}
          color={pct === 100 ? '#10b981' : '#f97316'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={t.priority} withLabel />
            <span className="font-mono text-[11px] text-slate-500">#{t.id.slice(-5).toUpperCase()}</span>
            <span className="ml-auto font-mono text-[11px] text-slate-500">
              {t.dueDate ? `Due ${formatDue(t.dueDate)}` : 'No due date'}
            </span>
          </div>
          <h3 className="text-[18px] font-semibold leading-snug text-slate-900">{t.title}</h3>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <StatusPill status={t.status} size="sm" />
            {t.job && <Tag tone="slate">{t.job}</Tag>}
            {t.assignee && (
              <div className="ml-auto">
                <Avatar user={t.assignee} size={22} />
              </div>
            )}
          </div>
        </div>
      </div>

      {pending.length > 0 && isOwner && (
        <div className="mt-4 rounded-xl border bg-amber-50 border-amber-200 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-700">
            <span>⏳</span> Awaiting your approval · {pending.length}
          </div>
          <div className="space-y-1.5">
            {pending.map((s) => {
              const openRow = () => onOpenTask(s.id);
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={stopThen(openRow)}
                  onKeyDown={keyboardClick(openRow)}
                  className="flex items-center gap-2 text-[16px] text-amber-900 rounded-md px-1 py-0.5 cursor-pointer hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                >
                  {s.assignee && <Avatar user={s.assignee} size={18} />}
                  <span className="truncate">{s.title}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={stopThen(() => onReject(s.id))}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={stopThen(() => onApprove(s.id))}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      <Icon.Check className="w-3 h-3" /> Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Unfinished · {unfinished.length}
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={stopThen(() => onAddSubtask(t))}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900"
            >
              <Icon.Plus className="w-3 h-3" /> Subtask
            </button>
          )}
        </div>
        <ul className="rt-none space-y-1.5">
          {unfinished.map((s) => {
            const blocker = s.blockedBy[0];
            const isBlocked = s.isBlocked;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={stopThen(() => onOpenTask(s.id))}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[16px] bg-slate-50 hover:bg-slate-100 text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS[s.status].swatch }} />
                  {s.assignee && <Avatar user={s.assignee} size={18} />}
                  <span className={`truncate text-slate-800 ${isBlocked ? 'opacity-60' : ''}`}>
                    {isBlocked && <Icon.Lock className="w-3 h-3 inline mr-1 align-text-bottom" />}
                    {s.title}
                  </span>
                  {isBlocked && blocker && (
                    <span className="ml-auto font-mono text-[10px] text-slate-500">
                      Waiting: {truncate(blocker.blockerTitle, 22)}
                    </span>
                  )}
                  {!isBlocked && (
                    <span className="ml-auto font-mono text-[10px] text-slate-500">
                      {formatMinutes(s.estimatedMinutes)} est
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {unfinished.length === 0 && (
            <li className="px-2 py-1.5 text-[16px] text-slate-400">🎉 Nothing pending. Approve & archive.</li>
          )}
        </ul>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
        {assignees.length > 0 && <AvatarStack users={assignees} size={20} />}
        <span className="font-mono text-[11px] text-slate-500">{formatMinutes(logMin)} / {formatMinutes(estMin)}</span>
        {isOwner && (
          <button
            type="button"
            onClick={stopThen(() => onBin(t.id))}
            className="ml-auto text-[11px] text-slate-500 hover:text-red-600"
          >
            Bin
          </button>
        )}
      </div>
    </div>
  );
}

function MemberChecklistCard({ t, currentUser, isOwner, onRequestReview, onApprove, onToggleStart, onOpenTask }) {
  const { done, total } = countSubtasksDone(t);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const openParent = () => onOpenTask(t.id);

  return (
    <div className="rounded-2xl border bg-white border-slate-200">
      <div
        role="button"
        tabIndex={0}
        onClick={openParent}
        onKeyDown={keyboardClick(openParent)}
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none rounded-t-2xl"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS[t.status].swatch }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14.5px] font-semibold text-slate-900 truncate">{t.title}</h3>
            {t.job && <Tag tone="slate">{t.job}</Tag>}
            <PriorityDot priority={t.priority} withLabel />
          </div>
          <div className="mt-1 text-[11.5px] font-mono text-slate-500">
            #{t.id.slice(-5).toUpperCase()} {t.dueDate ? `· Due ${formatDue(t.dueDate)}` : ''} · {done}/{total} ({pct}%)
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[11.5px] text-slate-500">Assigned to</span>
            {t.assignee ? (
              <>
                <Avatar user={t.assignee} size={20} />
                <span className="text-[13.5px] font-medium text-slate-700 truncate max-w-[160px]">
                  {t.assignee.name || t.assignee.email?.split('@')[0]}
                </span>
              </>
            ) : (
              <span className="text-[13.5px] italic text-slate-400">Unassigned</span>
            )}
          </div>
        </div>
        <div className="w-40 shrink-0"><ProgressBar value={pct} /></div>
      </div>

      <ul className="rt-none border-t border-slate-100">
        {t.subtasks.map((s) => {
          const blocker = s.blockedBy[0];
          const isBlocked = s.isBlocked;
          const isPending = s.status === 'PENDING_REVIEW';
          const isDone = s.status === 'DONE';
          const isMine = s.assigneeId === currentUser.id;
          const canRequest = isMine && !isDone && !isPending && !isBlocked;
          const openSub = () => onOpenTask(s.id);

          return (
            <li
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={openSub}
              onKeyDown={keyboardClick(openSub)}
              className={`flex items-center gap-3 pl-10 pr-4 py-2.5 text-[16.5px] border-b last:border-b-0 border-slate-100 relative cursor-pointer hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none
                ${isBlocked ? 'opacity-60' : ''}`}
            >
              <span className="absolute left-4 top-1/2 w-4 h-px bg-slate-200" />
              <Checkbox
                checked={isDone}
                onChange={() => {
                  if (isDone && isOwner) onRequestReview(s.id, 'IN_PROGRESS'); // owner uncheck → revert
                  else if (!isDone && isMine && !isBlocked) onToggleStart(s);
                }}
                disabled={isBlocked || (!isMine && !isOwner)}
              />
              <span className={`truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {isBlocked && <Icon.Lock className="w-3 h-3 inline mr-1 align-text-bottom text-slate-400" />}
                {s.title}
              </span>
              {isBlocked && blocker && (
                <span className="font-mono text-[11px] text-slate-500">
                  Waiting: {truncate(blocker.blockerTitle, 26)}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  {s.assignee ? (
                    <>
                      <Avatar user={s.assignee} size={20} />
                      <span className="hidden sm:inline text-[13.5px] text-slate-700 truncate max-w-[120px]">
                        {s.assignee.name || s.assignee.email?.split('@')[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-[13.5px] italic text-slate-400">Unassigned</span>
                  )}
                </span>
                <StatusPill status={s.status} size="sm" />
                <span className="font-mono text-[11px] text-slate-400">
                  {formatMinutes(s.loggedMinutes)} / {formatMinutes(s.estimatedMinutes)}
                </span>
                {canRequest && (
                  <button
                    type="button"
                    onClick={stopThen(() => onRequestReview(s.id))}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-orange-500 text-white hover:bg-orange-600"
                  >
                    Request review
                  </button>
                )}
                {isPending && !isOwner && (
                  <span className="text-[11px] text-amber-600 font-medium">Awaiting manager…</span>
                )}
                {isPending && isOwner && (
                  <button
                    type="button"
                    onClick={stopThen(() => onApprove(s.id))}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    <Icon.Check className="w-3 h-3" /> Approve
                  </button>
                )}
              </span>
            </li>
          );
        })}
        {t.subtasks.length === 0 && (
          <li className="px-4 py-3 text-[16px] text-slate-400">No subtasks yet.</li>
        )}
      </ul>
    </div>
  );
}

function BinList({ tree, isOwner, onRestore }) {
  const all = tree.flatMap((t) => [t, ...t.subtasks]);
  if (all.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-10 text-center">
        <div className="text-[16.5px] font-medium text-slate-700">Bin's empty.</div>
        <div className="mt-1 text-[16px] text-slate-500">Deleted tasks will appear here.</div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border bg-white border-slate-200 overflow-hidden">
      <ul className="rt-none divide-y divide-slate-100">
        {all.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-[16.5px]">
            <Icon.Bin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 truncate">{t.title}</span>
            {t.assignee && <Avatar user={t.assignee} size={18} />}
            <span className="ml-auto font-mono text-[11px] text-slate-500">
              Deleted {t.deletedAt ? formatDue(t.deletedAt) : '—'}
            </span>
            {isOwner && (
              <button
                type="button" onClick={() => onRestore(t.id)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Restore
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}


export default function PlannerClient({
  currentUser, project, isOwner,
  initialTree, initialFlat, members,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tree, setTree] = useState(initialTree);
  const [flat, setFlat] = useState(initialFlat);
  const [role, setRole] = useState(isOwner ? 'manager' : 'member');
  const [timeFilter, setTimeFilter] = useState('Week');
  // Empty set = no role filter (all tasks visible). Roles are free-form
  // strings now (custom or default like "UX & Art"), so we don't seed
  // this with a hardcoded enum list.
  const [jobFilter, setJobFilter] = useState(() => new Set());
  // Empty set = no member filter. Multi-select within members is OR.
  const [memberFilter, setMemberFilter] = useState(() => new Set());
  const [showBin, setShowBin] = useState(false);
  const [newTaskCtx, setNewTaskCtx] = useState(null); // null | { parent: task|null }
  const [showMembers, setShowMembers] = useState(false);
  const [currentMembers, setCurrentMembers] = useState(members);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const urlTaskId = searchParams.get('task');
  const [detailTaskId, setDetailTaskId] = useState(urlTaskId);

  useEffect(() => {
    setDetailTaskId(urlTaskId);
  }, [urlTaskId]);

  function openTask(id) {
    setDetailTaskId(id);
  }

  function closeTaskDetail() {
    setDetailTaskId(null);
    if (urlTaskId) {
      router.replace(pathname, { scroll: false });
    }
  }

  const firstMount = useRef(true);

  async function refresh(bin = showBin) {
    const res = await fetch(`/api/projects/${project.id}/tasks?bin=${bin ? 'true' : 'false'}`);
    if (res.ok) {
      const data = await res.json();
      setTree(data.tree);
      setFlat(data.tasks);
      setCurrentMembers(data.members);
    }
  }

  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    refresh(showBin);
  }, [showBin]);

  async function mutate(fn, { successMessage } = {}) {
    setBusy(true);
    try {
      const res = await fn();
      if (res && !res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.show(body.error || `Couldn't save. Please retry.`, { type: 'error' });
      } else if (successMessage) {
        toast.show(successMessage, { type: 'success' });
      }
      await refresh();
    } catch {
      toast.show("Couldn't reach the server. Please retry.", { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const putStatus = (id, status, opts) =>
    mutate(
      () => fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
      opts,
    );
  const requestReview = (id) => putStatus(id, 'PENDING_REVIEW', { successMessage: 'Review requested' });
  const approve = (id) => putStatus(id, 'DONE',         { successMessage: 'Task approved as DONE' });
  const reject  = (id) => putStatus(id, 'IN_PROGRESS',  { successMessage: 'Sent back for revision' });
  const startWork = (s) => putStatus(s.id, 'IN_PROGRESS');
  const binTask = (id) => mutate(
    () => fetch(`/api/tasks/${id}/bin`, { method: 'PUT' }),
    { successMessage: 'Task moved to bin' },
  );
  const restoreTask = (id) => mutate(
    () => fetch(`/api/tasks/${id}/restore`, { method: 'PUT' }),
    { successMessage: 'Task restored' },
  );

  // Member + role filters compose with AND. Within members it's OR
  // (multiple selected = tasks assigned to any of them). Empty set on
  // either filter means "no constraint from this dimension".
  const filteredTree = useMemo(() => {
    if (memberFilter.size === 0 && jobFilter.size === 0) return tree;
    return tree.filter((t) => {
      if (memberFilter.size > 0) {
        if (!t.assigneeId || !memberFilter.has(t.assigneeId)) return false;
      }
      if (jobFilter.size > 0) {
        if (!t.job || !jobFilter.has(t.job)) return false;
      }
      return true;
    });
  }, [tree, memberFilter, jobFilter]);

  const statusCounts = useMemo(() => {
    const counts = {};
    for (const t of flat) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [flat]);

  const jobCounts = useMemo(() => {
    const counts = {};
    for (const t of tree) if (t.job) counts[t.job] = (counts[t.job] ?? 0) + 1;
    return counts;
  }, [tree]);

  // Roles derived from the project's actual members + any role currently
  // appearing on a task (covers a member who's been removed but whose
  // tasks still carry their old role string).
  const projectRoles = useMemo(() => {
    const roles = new Set();
    for (const m of currentMembers) if (m.job?.trim()) roles.add(m.job);
    for (const t of tree) if (t.job?.trim()) roles.add(t.job);
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [currentMembers, tree]);

  // Roster for the Members filter: current members plus any task assignee
  // who isn't a member anymore (so their orphaned tasks can still be
  // surfaced under their name with a "(left)" tag).
  const memberRoster = useMemo(() => {
    const byId = new Map();
    for (const m of currentMembers) {
      byId.set(m.id, { id: m.id, name: m.name, email: m.email, isLeft: false });
    }
    for (const t of tree) {
      if (t.assigneeId && t.assignee && !byId.has(t.assigneeId)) {
        byId.set(t.assigneeId, {
          id: t.assigneeId,
          name: t.assignee.name,
          email: t.assignee.email,
          isLeft: true,
        });
      }
    }
    return Array.from(byId.values());
  }, [currentMembers, tree]);

  const otherMembers = useMemo(
    () => memberRoster
      .filter((m) => m.id !== currentUser.id)
      .sort((a, b) => {
        if (a.isLeft !== b.isLeft) return a.isLeft ? 1 : -1;
        return a.name.localeCompare(b.name);
      }),
    [memberRoster, currentUser.id],
  );

  // Per-member task counts respect the OTHER active filters (role)
  // so each chip previews how it would narrow the current view.
  const memberTaskCounts = useMemo(() => {
    const counts = new Map();
    for (const t of tree) {
      if (!t.assigneeId) continue;
      if (jobFilter.size > 0 && (!t.job || !jobFilter.has(t.job))) continue;
      counts.set(t.assigneeId, (counts.get(t.assigneeId) ?? 0) + 1);
    }
    return counts;
  }, [tree, jobFilter]);

  const subtaskTotal = useMemo(
    () => filteredTree.reduce((n, t) => n + t.subtasks.length, 0),
    [filteredTree],
  );

  function toggleJob(j) {
    setJobFilter((prev) => {
      const next = new Set(prev);
      next.has(j) ? next.delete(j) : next.add(j);
      return next;
    });
  }

  function toggleMember(id) {
    setMemberFilter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex">
      <aside className="w-[240px] shrink-0 border-r border-slate-200 bg-white p-4 min-h-[calc(100vh-56px)]">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Time</div>
        <div className="mt-2 flex flex-col gap-1">
          {TIME_FILTERS.map((f) => (
            <button
              key={f} type="button" onClick={() => setTimeFilter(f)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[16.5px]
                ${timeFilter === f ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span>{f}</span>
            </button>
          ))}
        </div>

        {/* Members filter */}
        {otherMembers.length > 0 && (
          <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Members
          </div>
        )}
        <div className={`${otherMembers.length > 0 ? 'mt-2' : 'mt-6'} flex flex-col gap-1 max-h-[300px] overflow-y-auto nice-scroll`}>
          {(() => {
            const meActive = memberFilter.has(currentUser.id);
            const meCount  = memberTaskCounts.get(currentUser.id) ?? 0;
            return (
              <button
                type="button"
                onClick={() => toggleMember(currentUser.id)}
                aria-pressed={meActive}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[16.5px] border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400
                  ${meActive
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'border-transparent text-slate-700 hover:bg-slate-50'}`}
              >
                <Icon.User className="w-3.5 h-3.5" />
                <span>My tasks</span>
                <span className={`ml-auto font-mono text-[11px] ${meActive ? 'font-semibold text-orange-700' : 'text-slate-400'}`}>
                  {meCount}
                </span>
              </button>
            );
          })()}
          {otherMembers.map((m) => {
            const active = memberFilter.has(m.id);
            const count  = memberTaskCounts.get(m.id) ?? 0;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                aria-pressed={active}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[16.5px] border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400
                  ${active
                    ? 'bg-slate-100 text-slate-900 border-slate-200'
                    : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                <Avatar user={m} size={22} />
                <span className="truncate flex-1 text-left">
                  {m.name}
                  {m.isLeft && (
                    <span className="ml-1 text-[10.5px] italic text-slate-400">(left)</span>
                  )}
                </span>
                <span className={`font-mono text-[11px] ${active ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {memberFilter.size > 0 && (
          <button
            type="button"
            onClick={() => setMemberFilter(new Set())}
            className="mt-1.5 ml-2.5 text-[10.5px] text-slate-500 hover:underline"
          >
            Clear filter
          </button>
        )}

        <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Roles</div>
        <div className="mt-2 flex flex-col gap-1">
          {projectRoles.length === 0 ? (
            <div className="px-2.5 py-1.5 text-[14px] text-slate-400 italic">
              No roles assigned yet.
            </div>
          ) : (
            projectRoles.map((j) => (
              <label key={j} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50">
                <Checkbox checked={jobFilter.has(j)} onChange={() => toggleJob(j)} />
                <span className="text-[16.5px] text-slate-700">{j}</span>
                <span className="ml-auto font-mono text-[11px] text-slate-400">{jobCounts[j] ?? 0}</span>
              </label>
            ))
          )}
        </div>
        {jobFilter.size > 0 && (
          <button
            type="button"
            onClick={() => setJobFilter(new Set())}
            className="mt-1.5 ml-2.5 text-[10.5px] text-slate-500 hover:underline"
          >
            Clear filter
          </button>
        )}

        <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</div>
        <div className="mt-2 space-y-1">
          {Object.values(STATUS).map((s) => (
            <div key={s.key} className="flex items-center gap-2 px-2.5 py-1 text-[16px]">
              <span className="w-2 h-2 rounded-full" style={{ background: s.swatch }} />
              <span className="text-slate-600">{s.label}</span>
              <span className="ml-auto font-mono text-[11px] text-slate-400">{statusCounts[s.key] ?? 0}</span>
            </div>
          ))}
        </div>

        <button
          type="button" onClick={() => setShowBin((v) => !v)}
          className={`mt-6 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[16.5px] border
            ${showBin ? 'bg-slate-900 text-white border-slate-900'
                     : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Icon.Bin className="w-3.5 h-3.5" />
          {showBin ? 'Back to planner' : 'Bin'}
        </button>
      </aside>

      <div className="flex-1 min-w-0 p-6">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              {showBin ? 'Bin' : 'Planner'} <span className="text-slate-400">· {project.name}</span>
            </h1>
            <div className="text-[14px] font-mono mt-0.5 text-slate-500">
              {showBin
                ? `${tree.length} binned · 30-day auto-purge`
                : `${timeFilter} view · ${filteredTree.length} parent tasks · ${subtaskTotal} subtasks`}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button" onClick={() => setShowMembers(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-[13px] font-medium hover:bg-orange-100 hover:border-orange-300 transition-colors"
            >
              <Icon.User className="w-3.5 h-3.5" /> Members
              <span className="font-mono text-[11px] text-orange-600 ml-0.5">{currentMembers.length}</span>
            </button>
            {isOwner && !showBin && (
              <button
                type="button" onClick={() => setNewTaskCtx({ parent: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[16.5px] font-medium hover:bg-orange-600"
              >
                <Icon.Plus className="w-3.5 h-3.5" /> New task
              </button>
            )}
            {isOwner && !showBin && (
              <div className="flex items-center p-1 rounded-xl bg-slate-100">
                {[
                  { k: 'manager', label: 'Manager view', icon: 'Boss' },
                  { k: 'member',  label: 'Member view',  icon: 'User' },
                ].map((r) => {
                  const IconCmp = Icon[r.icon];
                  return (
                    <button
                      key={r.k} type="button" onClick={() => setRole(r.k)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[16px] font-medium
                        ${role === r.k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <IconCmp className="w-3.5 h-3.5" /> {r.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {busy && <div className="text-[11px] font-mono text-slate-400 mb-3">Saving…</div>}

        {showBin ? (
          <BinList tree={tree} isOwner={isOwner} onRestore={restoreTask} />
        ) : filteredTree.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-10 text-center">
            <div className="text-[16.5px] font-medium text-slate-700">
              {tree.length === 0 ? 'No tasks yet.' : 'Nothing matches the current filters.'}
            </div>
            <div className="mt-1 text-[16px] text-slate-500">
              {tree.length === 0 && isOwner
                ? 'Click "New task" to seed the plan.'
                : tree.length === 0 ? 'Ask the project owner to add tasks.' : 'Try another job filter.'}
            </div>
          </div>
        ) : role === 'manager' ? (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredTree.map((t) => (
              <ManagerCard
                key={t.id} t={t} isOwner={isOwner}
                onApprove={approve} onReject={reject}
                onBin={binTask} onAddSubtask={(parent) => setNewTaskCtx({ parent })}
                onOpenTask={openTask}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTree.map((t) => (
              <MemberChecklistCard
                key={t.id} t={t} currentUser={currentUser} isOwner={isOwner}
                onRequestReview={(id, newStatus) => putStatus(id, newStatus ?? 'PENDING_REVIEW')}
                onApprove={approve} onToggleStart={startWork}
                onOpenTask={openTask}
              />
            ))}
          </div>
        )}
      </div>

      {newTaskCtx && (
        <NewTaskModal
          projectId={project.id}
          parent={newTaskCtx.parent}
          members={currentMembers}
          onClose={() => setNewTaskCtx(null)}
          onCreated={() => { setNewTaskCtx(null); refresh(); }}
        />
      )}

      {showMembers && (
        <MembersModal
          projectId={project.id}
          projectName={project.name}
          currentUser={currentUser}
          isOwner={isOwner}
          members={currentMembers}
          onClose={() => setShowMembers(false)}
          onUpdate={refresh}
        />
      )}

      {detailTaskId && (
        <TaskDetailModal
          projectId={project.id}
          taskId={detailTaskId}
          onClose={closeTaskDetail}
          onChange={refresh}
        />
      )}
    </div>
  );
}
