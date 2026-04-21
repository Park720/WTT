'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Avatar, AvatarStack, StatusPill, PriorityDot, Tag, ProgressBar, CircularProgress,
  Checkbox, Icon,
  STATUS, JOB_LABELS,
} from '@/components/ui';
import MembersModal from '@/components/MembersModal';
import NewTaskModal from '@/components/NewTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';

const TIME_FILTERS = ['Today', 'Week', 'Month'];
const JOB_KEYS = Object.keys(JOB_LABELS);

function hours(mins) {
  if (!mins) return 0;
  return Math.round(mins / 60);
}

function formatDue(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          <h3 className="text-[15px] font-semibold leading-snug text-slate-900">{t.title}</h3>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <StatusPill status={t.status} size="sm" />
            {t.job && <Tag tone="slate">{JOB_LABELS[t.job]}</Tag>}
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
                  className="flex items-center gap-2 text-[12.5px] text-amber-900 rounded-md px-1 py-0.5 cursor-pointer hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
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
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] bg-slate-50 hover:bg-slate-100 text-left"
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
                      {hours(s.estimatedMinutes)}h est
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {unfinished.length === 0 && (
            <li className="px-2 py-1.5 text-[12.5px] text-slate-400">🎉 Nothing pending. Approve & archive.</li>
          )}
        </ul>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
        {assignees.length > 0 && <AvatarStack users={assignees} size={20} />}
        <span className="font-mono text-[11px] text-slate-500">{hours(logMin)}h / {hours(estMin)}h</span>
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
            {t.job && <Tag tone="slate">{JOB_LABELS[t.job]}</Tag>}
            <PriorityDot priority={t.priority} withLabel />
          </div>
          <div className="mt-1 text-[11.5px] font-mono text-slate-500">
            #{t.id.slice(-5).toUpperCase()} {t.dueDate ? `· Due ${formatDue(t.dueDate)}` : ''} · {done}/{total} ({pct}%)
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
              className={`flex items-center gap-3 pl-10 pr-4 py-2.5 text-[13px] border-b last:border-b-0 border-slate-100 relative cursor-pointer hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none
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
              {s.assignee && <Avatar user={s.assignee} size={18} />}
              {isBlocked && blocker && (
                <span className="font-mono text-[11px] text-slate-500">
                  Waiting: {truncate(blocker.blockerTitle, 26)}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <StatusPill status={s.status} size="sm" />
                <span className="font-mono text-[11px] text-slate-400">
                  {hours(s.loggedMinutes)}/{hours(s.estimatedMinutes)}h
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
          <li className="px-4 py-3 text-[12.5px] text-slate-400">No subtasks yet.</li>
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
        <div className="text-[14px] font-medium text-slate-700">Bin's empty.</div>
        <div className="mt-1 text-[12.5px] text-slate-500">Deleted tasks will appear here.</div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border bg-white border-slate-200 overflow-hidden">
      <ul className="rt-none divide-y divide-slate-100">
        {all.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
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
  const [jobFilter, setJobFilter] = useState(new Set(JOB_KEYS));
  const [showBin, setShowBin] = useState(false);
  const [newTaskCtx, setNewTaskCtx] = useState(null); // null | { parent: task|null }
  const [showMembers, setShowMembers] = useState(false);
  const [currentMembers, setCurrentMembers] = useState(members);
  const [busy, setBusy] = useState(false);

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

  async function mutate(fn) {
    setBusy(true);
    try {
      const res = await fn();
      if (res && !res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || `Request failed (${res.status})`);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const putStatus = (id, status) =>
    mutate(() =>
      fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    );
  const requestReview = (id) => putStatus(id, 'PENDING_REVIEW');
  const approve = (id) => putStatus(id, 'DONE');
  const reject = (id) => putStatus(id, 'IN_PROGRESS');
  const startWork = (s) => putStatus(s.id, 'IN_PROGRESS');
  const binTask = (id) => mutate(() => fetch(`/api/tasks/${id}/bin`, { method: 'PUT' }));
  const restoreTask = (id) => mutate(() => fetch(`/api/tasks/${id}/restore`, { method: 'PUT' }));

  const filteredTree = useMemo(
    () => tree.filter((t) => !t.job || jobFilter.has(t.job)),
    [tree, jobFilter],
  );

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

  return (
    <div className="flex">
      <aside className="w-[240px] shrink-0 border-r border-slate-200 bg-white p-4 min-h-[calc(100vh-56px)]">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Time</div>
        <div className="mt-2 flex flex-col gap-1">
          {TIME_FILTERS.map((f) => (
            <button
              key={f} type="button" onClick={() => setTimeFilter(f)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px]
                ${timeFilter === f ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span>{f}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Roles</div>
        <div className="mt-2 flex flex-col gap-1">
          {JOB_KEYS.map((j) => (
            <label key={j} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <Checkbox checked={jobFilter.has(j)} onChange={() => toggleJob(j)} />
              <span className="text-[13px] text-slate-700">{JOB_LABELS[j]}</span>
              <span className="ml-auto font-mono text-[11px] text-slate-400">{jobCounts[j] ?? 0}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</div>
        <div className="mt-2 space-y-1">
          {Object.values(STATUS).map((s) => (
            <div key={s.key} className="flex items-center gap-2 px-2.5 py-1 text-[12.5px]">
              <span className="w-2 h-2 rounded-full" style={{ background: s.swatch }} />
              <span className="text-slate-600">{s.label}</span>
              <span className="ml-auto font-mono text-[11px] text-slate-400">{statusCounts[s.key] ?? 0}</span>
            </div>
          ))}
        </div>

        <button
          type="button" onClick={() => setShowBin((v) => !v)}
          className={`mt-6 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] border
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
            <div className="text-[12px] font-mono mt-0.5 text-slate-500">
              {showBin
                ? `${tree.length} binned · 30-day auto-purge`
                : `${timeFilter} view · ${filteredTree.length} parent tasks · ${subtaskTotal} subtasks`}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button" onClick={() => setShowMembers(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50"
            >
              <Icon.User className="w-3.5 h-3.5" /> Members
              <span className="font-mono text-[11px] text-slate-400 ml-0.5">{currentMembers.length}</span>
            </button>
            {isOwner && !showBin && (
              <button
                type="button" onClick={() => setNewTaskCtx({ parent: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600"
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium
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
            <div className="text-[14px] font-medium text-slate-700">
              {tree.length === 0 ? 'No tasks yet.' : 'Nothing matches the current filters.'}
            </div>
            <div className="mt-1 text-[12.5px] text-slate-500">
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
