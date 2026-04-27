'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AvatarStack, ProgressBar, Icon } from '@/components/ui';
import { useToast } from '@/components/Toaster';
import useEscape from '@/hooks/useEscape';
import EditProjectModal from '@/components/EditProjectModal/EditProjectModal';
import DeleteProjectDialog from '@/components/DeleteProjectDialog/DeleteProjectDialog';

const FILTERS = ['All', 'Mine', 'Active', 'Launching', 'Archived'];

const COLOR_SWATCHES = [
  '#f97316', '#ef4444', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

function greetingForHour(h) {
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDue(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isUrgent(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() - Date.now() < 3 * 86400000;
}

function isoWeek(d = new Date()) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
}

function DueTag({ iso }) {
  if (!iso) {
    return <span className="font-mono text-[11px] text-slate-400">no due date</span>;
  }
  const urgent = isUrgent(iso);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border
      ${urgent ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${urgent ? 'bg-orange-500' : 'bg-slate-400'}`} />
      Due {formatDue(iso)}
    </span>
  );
}

function ProjectCard({ p, isOwner, onEdit, onShowExports, onDelete }) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);
  const tag = p.description?.slice(0, 24) || 'Project';

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const pickFromMenu = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    action(p);
  };

  async function handleExport(e) {
    e.preventDefault();
    e.stopPropagation();
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${p.id}/export`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.show(body.error || 'Export failed', { type: 'error' });
        return;
      }
      const data = await res.json();
      toast.show('Export ready — opening print view', { type: 'success' });
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Link
      href={`/project/${p.id}/planner`}
      className="text-left rounded-2xl border p-5 hover-lift flex flex-col bg-white border-slate-200 group"
    >
      <div className="h-1 w-10 rounded-full mb-3" style={{ background: p.color }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-[15px] font-semibold"
            style={{ background: `${p.color}1a`, color: p.color }}
          >
            {p.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="text-[14.5px] font-semibold truncate text-slate-900">{p.name}</div>
            <div className="text-[11.5px] font-mono mt-0.5 text-slate-500 truncate">
              {tag} · upd {timeAgo(p.updatedAt)}
            </div>
          </div>
        </div>
        <div ref={menuWrapRef} className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="p-1 rounded hover:bg-black/5 text-slate-400"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Menu"
          >
            <Icon.Dots className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-8 w-[200px] rounded-xl bg-white border border-slate-200 shadow-lift-lg py-1 z-20"
            >
              {isOwner && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => pickFromMenu(e, onEdit)}
                  className="w-full h-10 px-3 flex items-center gap-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Icon.Settings className="w-4 h-4 text-slate-500" />
                  Edit project
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={(e) => pickFromMenu(e, onShowExports)}
                className="w-full h-10 px-3 flex items-center gap-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                <Icon.Download className="w-4 h-4 text-slate-500" />
                Recent exports
              </button>
              {isOwner && (
                <>
                  <div className="my-1 h-px bg-slate-200" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => pickFromMenu(e, onDelete)}
                    className="w-full h-10 px-3 flex items-center gap-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
                  >
                    <Icon.Bin className="w-4 h-4" />
                    Delete project
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-500">{p.tasksDone}/{p.tasksTotal} tasks</span>
          <span className="ml-auto font-semibold text-slate-900">{p.progress}%</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar value={p.progress} tone={p.progress >= 100 ? 'emerald' : 'brand'} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <AvatarStack users={p.members} size={22} />
        <DueTag iso={p.nextDueDate} />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <span className="text-[12px] font-medium text-slate-700 group-hover:text-slate-900">Open →</span>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <Icon.Download className="w-3 h-3" /> {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>
    </Link>
  );
}

function ExportsHistoryModal({ project, onClose }) {
  useEscape(onClose);
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/exports`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load exports');
        const data = await res.json();
        if (!cancelled) setLogs(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [project.id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-3xl bg-white shadow-lift-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-[18px] font-semibold">Recent exports</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">{project.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <Icon.X className="w-4 h-4" />
          </button>
        </div>

        {error && <p className="text-[12px] text-red-600">{error}</p>}
        {!logs && !error && <p className="text-[12.5px] text-slate-400">Loading…</p>}
        {logs && logs.length === 0 && (
          <p className="text-[12.5px] text-slate-500 italic">No exports yet. Hit the Export button on this card to create one.</p>
        )}
        {logs && logs.length > 0 && (
          <ul className="rt-none divide-y divide-slate-100">
            {logs.slice(0, 5).map((l) => (
              <li key={l.id} className="py-2.5 flex items-center gap-3 text-[13px]">
                <Icon.Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-800 truncate">by {l.exportedBy.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">{timeAgo(l.createdAt)}</div>
                </div>
                <a
                  href={l.fileUrl}
                  target="_blank" rel="noreferrer"
                  className="text-[11.5px] font-medium px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyProjectCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 p-5 hover-lift flex flex-col items-start"
    >
      <span className="text-2xl">✨</span>
      <div className="mt-2 text-[14px] font-medium text-slate-700">Start your first project</div>
      <div className="mt-1 text-[12px] text-slate-500">
        Drop a kickoff doc or type <kbd className="font-mono px-1 rounded bg-slate-100">/task</kbd> to seed the plan.
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-orange-600 font-medium">
        Start project <Icon.Arrow className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  useEscape(onClose);
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || 'Failed to create project';
        setError(msg);
        toast.show(msg, { type: 'error' });
        setLoading(false);
        return;
      }
      toast.show(`Project "${name}" created`, { type: 'success' });
      setLoading(false);
      onCreated();
    } catch {
      setError("Couldn't reach the server. Please retry.");
      toast.show("Couldn't reach the server. Please retry.", { type: 'error' });
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] rounded-3xl bg-white shadow-lift-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[18px] font-semibold">New project</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">You'll be the manager by default.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-400"
          >
            <Icon.X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Orbital — Ground Control"
              required
              autoFocus
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Description <span className="text-slate-400">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13.5px] focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Color</label>
            <div className="flex items-center gap-1.5">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 text-[13.5px] font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-xl bg-orange-500 text-white text-[13.5px] font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardClient({ user, projects }) {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [showNew, setShowNew] = useState(false);

  const [exportsFor, setExportsFor] = useState(null);
  const [editFor, setEditFor]       = useState(null);
  const [deleteFor, setDeleteFor]   = useState(null);

  const isOwnerOf = (p) => p.members.some((m) => m.id === user.id && m.role === 'OWNER');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Mine':
        return projects.filter((p) => p.members.some((m) => m.id === user.id && m.role === 'OWNER'));
      case 'Active':
        return projects.filter((p) => p.progress > 0 && p.progress < 100);
      case 'Launching':
        return projects.filter((p) => p.progress >= 80 && p.progress < 100);
      case 'Archived':
        return [];
      default:
        return projects;
    }
  }, [projects, filter, user.id]);

  const kpis = useMemo(() => {
    const overdue = projects.filter(
      (p) => p.nextDueDate && new Date(p.nextDueDate).getTime() < Date.now() && p.progress < 100,
    ).length;
    return {
      onTrack: projects.filter((p) => p.progress >= 50 && p.progress < 100).length,
      atRisk: projects.filter((p) => p.progress > 0 && p.progress < 50).length,
      overdue,
      thisWeek: projects.reduce((s, p) => s + p.tasksDueThisWeek, 0),
    };
  }, [projects]);

  const now = new Date();
  const firstName = user.name?.split(' ')[0] ?? user.email.split('@')[0];
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const week = isoWeek(now);
  const dueThisWeekCount = projects.filter(
    (p) => p.nextDueDate && new Date(p.nextDueDate).getTime() - Date.now() < 7 * 86400000,
  ).length;

  const kpiCards = [
    { k: 'On track',  v: kpis.onTrack,  sub: `of ${projects.length} projects` },
    { k: 'At risk',   v: kpis.atRisk,   sub: kpis.atRisk ? 'need attention' : 'all clear' },
    { k: 'Overdue',   v: kpis.overdue,  sub: kpis.overdue ? 'past due' : 'nothing' },
    { k: 'This week', v: kpis.thisWeek, sub: 'tasks due' },
  ];

  return (
    <div>
      <div className="px-8 py-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-[12px] font-mono text-slate-500">{dateLabel} · Week {week}</div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">
              {greetingForHour(now.getHours())}, {firstName}.{' '}
              <span className="text-slate-400">
                {projects.length} project{projects.length === 1 ? '' : 's'} · {dueThisWeekCount} due this week.
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[13px]"
            >
              <Icon.Filter className="w-3.5 h-3.5" /> Filter
            </button>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[13px] font-medium hover:bg-orange-600"
            >
              <Icon.Plus className="w-3.5 h-3.5" /> New project
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.k} className="rounded-2xl p-4 border bg-white border-slate-200">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{kpi.k}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-[28px] font-semibold text-slate-900">{kpi.v}</span>
                <span className="text-[12px] text-slate-500">{kpi.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 mb-4 flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-[12.5px] font-medium transition-all
                  ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto text-[12px] font-mono text-slate-500">
            sorted by · recently updated
          </div>
        </div>

        {filtered.length === 0 && projects.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <EmptyProjectCard onClick={() => setShowNew(true)} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-10 text-center">
            <div className="text-[14px] font-medium text-slate-700">Nothing matches &ldquo;{filter}&rdquo;.</div>
            <div className="mt-1 text-[12.5px] text-slate-500">Try another filter.</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                p={p}
                isOwner={isOwnerOf(p)}
                onEdit={setEditFor}
                onShowExports={setExportsFor}
                onDelete={setDeleteFor}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); router.refresh(); }}
        />
      )}

      {exportsFor && (
        <ExportsHistoryModal
          project={exportsFor}
          onClose={() => setExportsFor(null)}
        />
      )}

      {editFor && (
        <EditProjectModal
          project={editFor}
          onClose={() => setEditFor(null)}
          onSaved={() => { setEditFor(null); router.refresh(); }}
        />
      )}

      {deleteFor && (
        <DeleteProjectDialog
          project={deleteFor}
          onClose={() => setDeleteFor(null)}
          onDeleted={() => { setDeleteFor(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
