'use client';

import { useState } from 'react';
import { Icon, PRIORITY } from '@/components/ui';
import useEscape from '@/hooks/useEscape';
import { useToast } from '@/components/Toaster';
import { combineDueDateInputs } from '@/lib/format';

const PRIORITY_KEYS = Object.keys(PRIORITY);

export default function NewTaskModal({ projectId, parent, members = [], onClose, onCreated, zIndex = 60 }) {
  useEscape(onClose);
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          priority,
          dueDate: combineDueDateInputs(dueDate, dueTime) ?? undefined,
          assigneeId: assigneeId || undefined,
          parentTaskId: parent?.id,
          estimatedMinutes: estimatedHours ? Number(estimatedHours) * 60 : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || 'Failed to create task';
        setError(msg);
        toast.show(msg, { type: 'error' });
        setLoading(false);
        return;
      }
      toast.show(parent ? 'Subtask added' : 'Task added', { type: 'success' });
      setLoading(false);
      onCreated();
    } catch {
      setError("Couldn't reach the server. Please retry.");
      toast.show("Couldn't reach the server. Please retry.", { type: 'error' });
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
      style={{ zIndex }}
    >
      <div className="w-full max-w-[460px] rounded-3xl bg-white shadow-lift-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[18px] font-semibold">{parent ? 'New subtask' : 'New task'}</h2>
            {parent && <p className="text-[12.5px] text-slate-500 mt-0.5">Under: {parent.title}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <Icon.X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Title</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              required autoFocus placeholder="What needs doing?"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={2} placeholder="Acceptance criteria, links, context…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13.5px] focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Priority</label>
              <select
                value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] focus:outline-none focus:border-orange-400"
              >
                {PRIORITY_KEYS.map((k) => <option key={k} value={k}>{PRIORITY[k].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Estimated hours</label>
              <input
                type="number" min="0" step="0.5"
                value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0" className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Due date</label>
            <div className="flex items-start gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!e.target.value) setDueTime('');
                }}
                className="flex-1 min-w-0 h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] focus:outline-none focus:border-orange-400"
              />
              <div className="shrink-0">
                <input
                  type="time"
                  step={900}
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  disabled={!dueDate}
                  aria-label="Due time (optional)"
                  className="w-[112px] h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] focus:outline-none focus:border-orange-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <div className="text-[10.5px] text-slate-400 mt-1 text-center">Time (optional)</div>
              </div>
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Assignee</label>
            <select
              value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] focus:outline-none focus:border-orange-400"
            >
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 text-[13.5px] font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-xl bg-orange-500 text-white text-[13.5px] font-medium hover:bg-orange-600 disabled:opacity-60">
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
