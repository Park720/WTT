'use client';

import { useState } from 'react';
import { Avatar, Icon, Tag } from '@/components/ui';
import useEscape from '@/hooks/useEscape';
import { useToast } from '@/components/Toaster';
const DEFAULT_ROLES = [
  "UX & Art",
  "Programming",
  "Designer",
  "Publisher",
];

function RoleBadge({ role }) {
  if (role === 'OWNER') {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">Owner</span>;
  }
  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">Member</span>;
}

// Invite modal

function InviteMemberModal({ projectId, onClose, onInvited }) {
  useEscape(onClose);
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [job, setJob] = useState('Programming');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, job }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to invite');
      setLoading(false);
      return;
    }
    setLoading(false);
    toast.show(`Added ${email.trim().toLowerCase()} to the project`, { type: 'success' });
    onInvited();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] rounded-3xl bg-white shadow-lift-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[18px] font-semibold">Invite member</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">They'll need an account first.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <Icon.X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@team.co"
              required
              autoFocus
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[14px] focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Job role</label>
            <select
              value={DEFAULT_ROLES.includes(job) ? job : "CUSTOM"}
              onChange={(e) => {
  if (e.target.value === "CUSTOM") {
    setJob("");
  } else {
    setJob(e.target.value);
  }
}}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[14px] focus:outline-none focus:border-orange-400"
            >
              {DEFAULT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
              <option value="CUSTOM">Custom...</option>
            </select>

            {(!DEFAULT_ROLES.includes(job) || job === "") && (
              <input
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Enter custom role"
                className="mt-2 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[14px] focus:outline-none focus:border-orange-400"
              />
            )}
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 text-[14px] font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-xl bg-orange-500 text-white text-[14px] font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Member row

function MemberRow({ m, projectId, currentUserId, isOwner, onMutate }) {
  const [pendingJob, setPendingJob] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [error, setError] = useState('');

  const isSelf = m.id === currentUserId;
  const canEditJob = isOwner;
  const canRemove = isOwner && !isSelf;
  const canLeave = isSelf;
const [customRole, setCustomRole] = useState(m.job || '');
const [isCustomMode, setIsCustomMode] = useState(
  !!m.job && !DEFAULT_ROLES.includes(m.job)
);
  async function handleJobUpdate(nextJob) {
    const cleanJob = nextJob?.trim() || null;

    setError('');
    setPendingJob(true);

    const res = await fetch(`/api/projects/${projectId}/members/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: cleanJob }),
    });

    setPendingJob(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to update');
      return;
    }

    onMutate();
  }

  async function handleRemove() {
    const msg = canLeave && !isOwner
      ? 'Leave this project?'
      : isSelf
        ? 'Leave this project? You will lose access.'
        : `Remove ${m.name} from this project?`;

    if (!window.confirm(msg)) return;

    setError('');
    setPendingRemove(true);

    const res = await fetch(`/api/projects/${projectId}/members/${m.id}`, {
      method: 'DELETE',
    });

    setPendingRemove(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to remove');
      return;
    }

    onMutate();
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50">
      <Avatar user={{ name: m.name, email: m.email }} size={32} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-slate-900 truncate">
            {m.name}
          </span>
          <RoleBadge role={m.role} />
          {isSelf && (
            <span className="text-[10px] text-slate-400 font-mono">you</span>
          )}
        </div>

        <div className="text-[11.5px] font-mono text-slate-500 truncate">
          {m.email}
        </div>

        {error && (
          <div className="mt-1 text-[11px] text-red-600">{error}</div>
        )}
      </div>

      {canEditJob ? (
        <div className="flex flex-col items-end gap-1">
          <select
            value={
              !m.job
                ? ''
                : DEFAULT_ROLES.includes(m.job)
                  ? m.job
                  : 'CUSTOM'
            }
            disabled={pendingJob}
            onChange={(e) => {
  if (e.target.value === 'CUSTOM') {
    setIsCustomMode(true);
    setCustomRole('');
  } else {
    setIsCustomMode(false);
    setCustomRole(e.target.value);
    handleJobUpdate(e.target.value);
  }
}}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] focus:outline-none focus:border-orange-400 disabled:opacity-60"
          >
            <option value="">No job</option>
            {DEFAULT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
            <option value="CUSTOM">Custom...</option>
          </select>

          {isCustomMode && (
            <input
  value={customRole}
  onChange={(e) => setCustomRole(e.target.value)}
  onBlur={() => handleJobUpdate(customRole)}
  placeholder="Custom role"
  disabled={pendingJob}
  className="h-8 w-[130px] rounded-lg border border-slate-200 bg-white px-2 text-[12px] focus:outline-none focus:border-orange-400 disabled:opacity-60"
/>
          )}
        </div>
      ) : m.job ? (
        <Tag tone="slate">{m.job}</Tag>
      ) : (
        <span className="text-[11px] text-slate-400 font-mono">no job</span>
      )}

      {canRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={pendingRemove}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          title="Remove from project"
        >
          <Icon.X className="w-3.5 h-3.5" />
        </button>
      )}

      {canLeave && !canRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={pendingRemove}
          className="px-2 py-1 rounded-lg border border-slate-200 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {pendingRemove ? 'Leaving…' : 'Leave'}
        </button>
      )}
    </div>
  );
}

// Members modal (list + invite entry)

export default function MembersModal({
  projectId, projectName, currentUser, isOwner, members, onClose, onUpdate,
}) {
  const [showInvite, setShowInvite] = useState(false);
  // ESC closes this modal, unless the nested invite modal is open (it handles its own ESC).
  useEscape(onClose, !showInvite);

  const ownerCount = members.filter((m) => m.role === 'OWNER').length;
  const memberCount = members.length;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-[480px] rounded-3xl bg-white shadow-lift-lg overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-semibold">Project members</h2>
                <p className="text-[12.5px] text-slate-500 mt-0.5">
                  {projectName} · {memberCount} {memberCount === 1 ? 'person' : 'people'}
                  {ownerCount > 0 && `, ${ownerCount} ${ownerCount === 1 ? 'manager' : 'managers'}`}
                </p>
              </div>
              <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <Icon.X className="w-4 h-4" />
              </button>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-orange-500 text-white text-[14px] font-medium hover:bg-orange-600"
              >
                <Icon.Plus className="w-3.5 h-3.5" /> Invite member
              </button>
            )}
          </div>

          <div className="px-3 pb-4 max-h-[420px] overflow-y-auto nice-scroll">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                m={m}
                projectId={projectId}
                currentUserId={currentUser.id}
                isOwner={isOwner}
                onMutate={onUpdate}
              />
            ))}
            {members.length === 0 && (
              <div className="p-6 text-center text-[12.5px] text-slate-500">No members yet.</div>
            )}
          </div>
        </div>
      </div>

      {showInvite && (
        <InviteMemberModal
          projectId={projectId}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); onUpdate(); }}
        />
      )}
    </>
  );
}
