'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Avatar, StatusPill, PriorityDot, Tag, Icon, Checkbox,
  STATUS, PRIORITY, JOB_LABELS,
} from '@/components/ui';
import NewTaskModal from '@/components/NewTaskModal';
import useEscape from '@/hooks/useEscape';

const PRIORITY_KEYS = Object.keys(PRIORITY);

// ── helpers ──────────────────────────────────────────────────────────────────

function hours(mins) {
  if (!mins) return 0;
  return Math.round(mins / 60);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── sub-components ───────────────────────────────────────────────────────────

function Section({ title, right, children }) {
  return (
    <section className="px-6 py-4 border-t border-slate-100 first:border-t-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function BlockedBanner({ blocker, onGoToBlocker }) {
  return (
    <div className="mx-6 mt-4 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-slate-500">
        <Icon.Lock className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Blocked by</div>
        <div className="text-[13.5px] text-slate-900 font-medium truncate">{blocker?.blockerTitle ?? 'another task'}</div>
      </div>
      {blocker?.blockerTaskId && (
        <button
          type="button"
          onClick={() => onGoToBlocker(blocker.blockerTaskId)}
          className="text-[12px] font-medium text-orange-600 hover:text-orange-700 shrink-0"
        >
          Go to blocker →
        </button>
      )}
    </div>
  );
}

function SubtaskRow({ sub, onOpen }) {
  const isDone = sub.status === 'DONE';
  return (
    <button
      type="button"
      onClick={() => onOpen(sub.id)}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left"
    >
      {/* Static checkbox visual — not a <button>, since the whole row is the click target */}
      <span
        aria-hidden
        className={`inline-flex items-center justify-center rounded-[5px] border shrink-0 ${
          isDone ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-300'
        }`}
        style={{ width: 16, height: 16 }}
      >
        {isDone && (
          <svg viewBox="0 0 16 16" width={12} height={12} className="check">
            <path d="M3.5 8.5 L7 12 L13 4.5" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`flex-1 min-w-0 truncate text-[13px] ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
        {sub.isBlocked && <Icon.Lock className="w-3 h-3 inline mr-1 align-text-bottom text-slate-400" />}
        {sub.title}
      </span>
      {sub.assignee && <Avatar user={sub.assignee} size={18} />}
      <StatusPill status={sub.status} size="sm" />
    </button>
  );
}

function BlockerChip({ blocker, canRemove, onRemove, onOpen }) {
  const st = STATUS[blocker.blockerStatus] ?? STATUS.TODO;
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[12px] max-w-full">
      <Icon.Lock className="w-3 h-3 text-slate-500 shrink-0" />
      <button
        type="button"
        onClick={() => onOpen(blocker.blockerTaskId)}
        className="truncate text-slate-800 hover:text-slate-900"
      >
        {blocker.blockerTitle}
      </button>
      <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: st.swatch }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.swatch }} />
        {st.label}
      </span>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(blocker.blockerTaskId)}
          className="p-0.5 rounded text-slate-400 hover:bg-white hover:text-red-600 shrink-0"
          aria-label="Remove dependency"
        >
          <Icon.X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function TaskDetailModal({ projectId, taskId, onClose, onChange, depth = 0 }) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [task, setTask] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [edit, setEdit] = useState({
    title: '', description: '', priority: 'MEDIUM', dueDate: '',
    assigneeId: '', estimatedHours: '',
  });

  const [nestedTaskId, setNestedTaskId] = useState(null);
  const [showNewSubtask, setShowNewSubtask] = useState(false);

  const zIndex = 50 + depth * 10;
  const innerZ = zIndex + 10;

  // Close on ESC — only when no nested modal is on top.
  useEscape(onClose, !nestedTaskId && !showNewSubtask);

  // ── Load ───────────────────────────────────────────────────────────────────

  async function load() {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const t = data.tasks.find((x) => x.id === taskId);
      setTask(t ?? null);
      setAllTasks(data.tasks);
      setMembers(data.members);
      const me = currentUserId ? data.members.find((m) => m.id === currentUserId) : null;
      setIsOwner(me?.role === 'OWNER');
    } catch {
      // silent
    }
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, projectId, currentUserId]);

  const subtasks = useMemo(
    () => allTasks.filter((t) => t.parentTaskId === taskId),
    [allTasks, taskId],
  );

  const isParent = task && !task.parentTaskId;
  const isAssignee = task && task.assigneeId === currentUserId;
  const primaryBlocker = task?.blockedBy?.[0] ?? null;
  const existingBlockerIds = useMemo(
    () => new Set((task?.blockedBy ?? []).map((b) => b.blockerTaskId)),
    [task],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function mutate(fn, { closeOnSuccess = false } = {}) {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      if (res && !res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Request failed (${res.status})`);
        return false;
      }
      await load();
      onChange?.();
      if (closeOnSuccess) onClose();
      return true;
    } finally {
      setBusy(false);
    }
  }

  const putStatus = (status) =>
    mutate(() =>
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    );

  async function handleStartFocus() {
    if (task.status === 'TODO') {
      const ok = await putStatus('IN_PROGRESS');
      if (!ok) return;
    }
    router.push(`/project/${projectId}/timer?task=${taskId}`);
    onClose();
  }

  async function handleBin() {
    if (!window.confirm('Move this task to the bin?')) return;
    await mutate(() => fetch(`/api/tasks/${taskId}/bin`, { method: 'PUT' }), { closeOnSuccess: true });
  }

  function startEdit() {
    setEdit({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: toDateInput(task.dueDate),
      assigneeId: task.assigneeId ?? '',
      estimatedHours: task.estimatedMinutes ? task.estimatedMinutes / 60 : '',
    });
    setError('');
    setEditMode(true);
  }

  async function saveEdit() {
    const ok = await mutate(() =>
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: edit.title,
          description: edit.description || null,
          priority: edit.priority,
          dueDate: edit.dueDate || null,
          assigneeId: edit.assigneeId || null,
          estimatedMinutes: edit.estimatedHours ? Number(edit.estimatedHours) * 60 : null,
        }),
      }),
    );
    if (ok) setEditMode(false);
  }

  async function addDependency(blockerTaskId) {
    if (!blockerTaskId) return;
    await mutate(() =>
      fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerTaskId }),
      }),
    );
  }

  async function removeDependency(blockerTaskId) {
    await mutate(() =>
      fetch(`/api/tasks/${taskId}/dependencies?blockerTaskId=${blockerTaskId}`, {
        method: 'DELETE',
      }),
    );
  }

  // ── Action buttons ────────────────────────────────────────────────────────

  function renderActions() {
    if (!task) return null;
    if (editMode) {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditMode(false)}
            disabled={busy}
            className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-[13.5px] font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={busy || !edit.title.trim()}
            className="ml-auto h-10 px-5 rounded-xl bg-orange-500 text-white text-[13.5px] font-medium hover:bg-orange-600 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      );
    }

    const blocked = task.isBlocked;
    const isDone = task.status === 'DONE';
    const isPending = task.status === 'PENDING_REVIEW';
    const isInProgress = task.status === 'IN_PROGRESS';
    const canFocus = isAssignee && !blocked && !isDone && !isPending;
    const canRequestReview = isAssignee && isInProgress && !blocked;

    // ── Owner utilities: always rendered when isOwner, never gated by task
    //    shape (parent/subtask) or status. Lives in its own left-aligned
    //    group so primary actions on the right can never push them out.
    const ownerUtilities = isOwner ? (
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={startEdit}
          disabled={busy}
          className="h-10 px-3 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          <Icon.Settings className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          type="button"
          onClick={handleBin}
          disabled={busy}
          className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          <Icon.Bin className="w-3.5 h-3.5" /> Move to bin
        </button>
      </div>
    ) : null;

    // ── Primary status-specific actions (right side)
    const primaryBtns = [];
    if (!blocked) {
      if (isOwner && isPending) {
        primaryBtns.push(
          <button
            key="reject"
            type="button"
            onClick={() => putStatus('IN_PROGRESS')}
            disabled={busy}
            className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-[13.5px] font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            Reject
          </button>,
        );
        primaryBtns.push(
          <button
            key="approve"
            type="button"
            onClick={() => putStatus('DONE')}
            disabled={busy}
            className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-[13.5px] font-medium hover:bg-emerald-600 disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            <Icon.Check className="w-3.5 h-3.5" /> Approve
          </button>,
        );
      }
      if (canRequestReview) {
        primaryBtns.push(
          <button
            key="review"
            type="button"
            onClick={() => putStatus('PENDING_REVIEW')}
            disabled={busy}
            className="h-10 px-4 rounded-xl border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 text-[13.5px] font-medium disabled:opacity-60"
          >
            Request review
          </button>,
        );
      }
      if (canFocus) {
        primaryBtns.push(
          <button
            key="focus"
            type="button"
            onClick={handleStartFocus}
            disabled={busy}
            className="h-10 px-5 rounded-xl bg-orange-500 text-white text-[13.5px] font-semibold hover:bg-orange-600 disabled:opacity-60 inline-flex items-center gap-1.5 shadow-lift"
          >
            <Icon.Play className="w-3.5 h-3.5" /> Start focus session
          </button>,
        );
      }
    }

    const blockedHint = blocked && (
      <span className="text-[12px] font-medium text-slate-500 inline-flex items-center gap-1.5">
        <Icon.Lock className="w-3.5 h-3.5" /> Actions unavailable while blocked
      </span>
    );

    return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: owner utilities (always when isOwner) */}
        <div className="flex items-center gap-2 min-w-0">{ownerUtilities}</div>
        {/* Right: primary actions or blocked hint */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {blockedHint}
          {primaryBtns}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
        style={{ zIndex }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-[640px] rounded-3xl bg-white shadow-lift-lg max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {task && <StatusPill status={task.status} size="sm" />}
                {task?.job && <Tag tone="slate">{JOB_LABELS[task.job]}</Tag>}
                {task && <span className="font-mono text-[11px] text-slate-400">#{task.id.slice(-5).toUpperCase()}</span>}
              </div>
              <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400 shrink-0">
                <Icon.X className="w-4 h-4" />
              </button>
            </div>

            {loading && !task ? (
              <div className="mt-3 space-y-2">
                <div className="h-6 bg-slate-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
              </div>
            ) : task ? (
              editMode ? (
                <input
                  value={edit.title}
                  onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
                  className="mt-3 w-full text-[18px] font-semibold text-slate-900 bg-transparent border-b border-slate-300 focus:outline-none focus:border-orange-400 py-1"
                  placeholder="Title"
                />
              ) : (
                <h2 className="mt-3 text-[18px] font-semibold text-slate-900 leading-snug">{task.title}</h2>
              )
            ) : null}

            {task && !editMode && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <PriorityDot priority={task.priority} withLabel />
                {task.dueDate && (
                  <span className="font-mono text-[12px] text-slate-500">
                    Due {formatDate(task.dueDate)}
                    {formatTime(task.dueDate) && `, ${formatTime(task.dueDate)}`}
                  </span>
                )}
                {task.assignee && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                    <Avatar user={task.assignee} size={18} />
                    {task.assignee.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Blocked banner ─────────────────────────────────────────── */}
          {task?.isBlocked && (
            <BlockedBanner
              blocker={primaryBlocker}
              onGoToBlocker={(id) => setNestedTaskId(id)}
            />
          )}

          {/* ── Scrollable body ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto nice-scroll">
            {loading && !task ? (
              <div className="px-6 py-8 text-[13px] text-slate-400">Loading…</div>
            ) : !task ? (
              <div className="px-6 py-8 text-[13px] text-slate-500">Task not found.</div>
            ) : (
              <>
                {/* Details */}
                <Section title="Details">
                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11.5px] font-medium text-slate-700 mb-1.5 block">Description</label>
                        <textarea
                          value={edit.description}
                          onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
                          rows={3}
                          placeholder="Acceptance criteria, links, context…"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-orange-400 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11.5px] font-medium text-slate-700 mb-1.5 block">Priority</label>
                          <select
                            value={edit.priority}
                            onChange={(e) => setEdit((s) => ({ ...s, priority: e.target.value }))}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] focus:outline-none focus:border-orange-400"
                          >
                            {PRIORITY_KEYS.map((k) => <option key={k} value={k}>{PRIORITY[k].label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11.5px] font-medium text-slate-700 mb-1.5 block">Due date</label>
                          <input
                            type="date"
                            value={edit.dueDate}
                            onChange={(e) => setEdit((s) => ({ ...s, dueDate: e.target.value }))}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] focus:outline-none focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11.5px] font-medium text-slate-700 mb-1.5 block">Assignee</label>
                          <select
                            value={edit.assigneeId}
                            onChange={(e) => setEdit((s) => ({ ...s, assigneeId: e.target.value }))}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] focus:outline-none focus:border-orange-400"
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11.5px] font-medium text-slate-700 mb-1.5 block">Estimated hours</label>
                          <input
                            type="number" min="0" step="0.5"
                            value={edit.estimatedHours}
                            onChange={(e) => setEdit((s) => ({ ...s, estimatedHours: e.target.value }))}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] focus:outline-none focus:border-orange-400"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {task.description ? (
                        <p className="text-[13.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {task.description}
                        </p>
                      ) : (
                        <p className="text-[12.5px] text-slate-400 italic">No description.</p>
                      )}
                      <div className="flex items-center gap-6 text-[12.5px]">
                        <div>
                          <div className="text-slate-500 text-[10.5px] uppercase tracking-wider font-medium mb-0.5">Time</div>
                          <div className="font-mono text-slate-800">
                            {hours(task.loggedMinutes)}h / {hours(task.estimatedMinutes)}h
                          </div>
                        </div>
                        {task.assignee && (
                          <div>
                            <div className="text-slate-500 text-[10.5px] uppercase tracking-wider font-medium mb-0.5">Assignee</div>
                            <div className="flex items-center gap-1.5">
                              <Avatar user={task.assignee} size={18} />
                              <span className="text-slate-800">{task.assignee.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Section>

                {/* Subtasks (parents only) */}
                {isParent && (
                  <Section
                    title={`Subtasks · ${subtasks.length}`}
                    right={
                      isOwner && !editMode && (
                        <button
                          type="button"
                          onClick={() => setShowNewSubtask(true)}
                          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-600 hover:text-slate-900"
                        >
                          <Icon.Plus className="w-3 h-3" /> Add subtask
                        </button>
                      )
                    }
                  >
                    {subtasks.length === 0 ? (
                      <p className="text-[12.5px] text-slate-400 italic">No subtasks yet.</p>
                    ) : (
                      <div className="space-y-0.5">
                        {subtasks.map((s) => (
                          <SubtaskRow key={s.id} sub={s} onOpen={(id) => setNestedTaskId(id)} />
                        ))}
                      </div>
                    )}
                  </Section>
                )}

                {/* Dependencies */}
                <Section title={`Dependencies · ${task.blockedBy.length}`}>
                  {task.blockedBy.length === 0 && !isOwner && (
                    <p className="text-[12.5px] text-slate-400 italic">Nothing blocking this task.</p>
                  )}
                  {task.blockedBy.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {task.blockedBy.map((b) => (
                        <BlockerChip
                          key={b.blockerTaskId}
                          blocker={b}
                          canRemove={isOwner && !editMode}
                          onRemove={removeDependency}
                          onOpen={(id) => setNestedTaskId(id)}
                        />
                      ))}
                    </div>
                  )}
                  {isOwner && !editMode && (
                    <select
                      value=""
                      onChange={(e) => {
                        const id = e.target.value;
                        e.target.value = '';
                        if (id) addDependency(id);
                      }}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] text-slate-600 focus:outline-none focus:border-orange-400"
                    >
                      <option value="">+ Add dependency…</option>
                      {allTasks
                        .filter((t) => t.id !== taskId && !existingBlockerIds.has(t.id) && !t.isDeleted)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  )}
                </Section>

                {/* Activity */}
                <Section title="Activity">
                  <div className="text-[12.5px] text-slate-600 space-y-1 font-mono">
                    <div>Created {formatDate(task.createdAt)}</div>
                    {task.assignee && <div>Assigned to {task.assignee.name}</div>}
                    {task.status === 'DONE' && <div className="text-emerald-600">Marked done</div>}
                    {task.status === 'PENDING_REVIEW' && <div className="text-amber-600">Awaiting review</div>}
                  </div>
                </Section>
              </>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          {task && (
            <div className="px-6 py-3 border-t border-slate-100 bg-white shrink-0">
              {error && (
                <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  {error}
                </p>
              )}
              {renderActions()}
            </div>
          )}
        </div>
      </div>

      {/* Nested subtask detail */}
      {nestedTaskId && (
        <TaskDetailModal
          projectId={projectId}
          taskId={nestedTaskId}
          depth={depth + 1}
          onClose={() => setNestedTaskId(null)}
          onChange={() => { load(); onChange?.(); }}
        />
      )}

      {/* New subtask creation */}
      {showNewSubtask && (
        <NewTaskModal
          projectId={projectId}
          parent={task}
          members={members}
          zIndex={innerZ}
          onClose={() => setShowNewSubtask(false)}
          onCreated={() => { setShowNewSubtask(false); load(); onChange?.(); }}
        />
      )}
    </>
  );
}
