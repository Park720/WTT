'use client';

import { useEffect, useMemo } from 'react';
import { STATUS } from '@/components/ui/constants';

function hours(mins) {
  if (!mins) return 0;
  return Math.round((mins / 60) * 10) / 10;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildTree(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, { ...t, subtasks: [] }]));
  const roots = [];
  for (const t of byId.values()) {
    if (t.parentTaskId && byId.has(t.parentTaskId)) byId.get(t.parentTaskId).subtasks.push(t);
    else roots.push(t);
  }
  const sort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  roots.sort(sort);
  roots.forEach((r) => r.subtasks.sort(sort));
  return roots;
}

function StatusDot({ status }) {
  const s = STATUS[status] ?? STATUS.TODO;
  return (
    <span className="status-dot" style={{ background: s.swatch }} aria-hidden>
      &nbsp;
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function PrintView({ project, tasks, members, exporter, exportedAt }) {
  // Auto-open print dialog on load
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const visibleTasks = useMemo(() => tasks.filter((t) => !t.isDeleted), [tasks]);
  const tree = useMemo(() => buildTree(visibleTasks), [visibleTasks]);

  // ── Progress summary ────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = visibleTasks.length;
    const done = visibleTasks.filter((t) => t.status === 'DONE').length;
    const inProgress = visibleTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const pending = visibleTasks.filter((t) => t.status === 'PENDING_REVIEW').length;
    const todo = visibleTasks.filter((t) => t.status === 'TODO').length;
    const blocked = visibleTasks.filter((t) => t.isBlocked).length;
    const estMin = visibleTasks.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0);
    const logMin = visibleTasks.reduce((n, t) => n + (t.loggedMinutes ?? 0), 0);
    return {
      total, done, inProgress, pending, todo, blocked,
      pct: total ? Math.round((done / total) * 100) : 0,
      estHours: hours(estMin), logHours: hours(logMin),
    };
  }, [visibleTasks]);

  // ── Member workload (grouped by job) ────────────────────────────────────
  const workloadByJob = useMemo(() => {
    const buckets = {};
    for (const m of members) {
      const key = m.job ?? 'UNASSIGNED';
      if (!buckets[key]) buckets[key] = [];
      const assigned = visibleTasks.filter((t) => t.assigneeId === m.id);
      buckets[key].push({
        ...m,
        assignedCount: assigned.length,
        doneCount: assigned.filter((t) => t.status === 'DONE').length,
        estHours: hours(assigned.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0)),
        logHours: hours(assigned.reduce((n, t) => n + (t.loggedMinutes ?? 0), 0)),
      });
    }
    return buckets;
  }, [members, visibleTasks]);

  // ── Grouped task list (by status) ───────────────────────────────────────
  const groupedTasks = useMemo(() => {
    const groups = { IN_PROGRESS: [], PENDING_REVIEW: [], TODO: [], DONE: [] };
    const put = (t) => {
      const key = groups[t.status] ? t.status : 'TODO';
      groups[key].push(t);
    };
    for (const t of tree) {
      put(t);
    }
    return groups;
  }, [tree]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  return (
    <>
      <style jsx global>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        body { background: #fafaf7; }
        .report {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px 40px;
          color: #0f172a;
          font-size: 12px;
          line-height: 1.55;
        }
        @media print {
          .report { padding: 0; max-width: none; }
        }
        .report h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        .report h2 {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
          font-weight: 600; color: #64748b; margin: 24px 0 10px; border-top: 1px solid #e2e8f0; padding-top: 16px;
        }
        .report h3 { font-size: 13px; font-weight: 600; margin: 14px 0 6px; }
        .report p { margin: 0 0 8px; }
        .report .muted { color: #64748b; }
        .report .mono { font-family: var(--font-geist-mono, ui-monospace, monospace); font-feature-settings: "tnum"; }
        .report .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .report .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .report .kpi {
          border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;
          background: #ffffff; break-inside: avoid;
        }
        .report .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
        .report .kpi-value { font-size: 20px; font-weight: 600; font-family: var(--font-geist-mono, ui-monospace, monospace); margin-top: 4px; }
        .status-dot {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%;
          margin-right: 6px; vertical-align: middle;
        }
        .report table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .report th, .report td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .report th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 600; }
        .task-row { break-inside: avoid; }
        .task-row .title { font-weight: 500; }
        .task-row .subrow { padding-left: 18px; color: #475569; border-left: 2px solid #e2e8f0; margin-left: 6px; padding-top: 3px; padding-bottom: 3px; }
        .task-group { margin-bottom: 14px; break-inside: avoid-page; }
        .task-list { list-style: none; padding: 0; margin: 0; }
        .task-list li { padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
        .task-list li:last-child { border-bottom: 0; }
        .lock { font-size: 10px; color: #f59e0b; }
        .hbar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
        .hbar > div { height: 100%; background: #f97316; }
        .footer {
          font-size: 10px; color: #64748b; text-align: center; margin-top: 28px;
          border-top: 1px solid #e2e8f0; padding-top: 12px;
        }
        .no-print-toolbar {
          position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 10;
        }
        .no-print-toolbar button {
          padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 500;
          cursor: pointer; border: 1px solid #e2e8f0; background: white; color: #334155;
        }
        .no-print-toolbar button.primary { background: #f97316; color: white; border-color: #f97316; }
      `}</style>

      {/* Toolbar visible only on screen (not in the printed doc) */}
      <div className="no-print no-print-toolbar">
        <button type="button" onClick={() => window.close()}>Close</button>
        <button type="button" className="primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="report">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ borderLeft: `4px solid ${project.color}`, paddingLeft: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b' }}>
            Project report
          </div>
          <h1>{project.name}</h1>
          {project.description && <p className="muted" style={{ marginTop: 6 }}>{project.description}</p>}
          <div className="mono muted" style={{ marginTop: 8, fontSize: 10.5 }}>
            Created {formatDate(project.createdAt)} · Last updated {formatDate(project.updatedAt)}
          </div>
        </div>

        {/* ── Progress summary ─────────────────────────────────────── */}
        <h2>Progress</h2>
        <div className="grid-4">
          <div className="kpi">
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{summary.total}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Completed</div>
            <div className="kpi-value" style={{ color: '#10b981' }}>{summary.done}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">In progress</div>
            <div className="kpi-value" style={{ color: '#f97316' }}>{summary.inProgress}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Blocked</div>
            <div className="kpi-value" style={{ color: '#64748b' }}>{summary.blocked}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span className="muted">Completion</span>
            <span className="mono">{summary.pct}% · {summary.logHours}h logged / {summary.estHours}h estimated</span>
          </div>
          <div className="hbar"><div style={{ width: `${summary.pct}%` }} /></div>
        </div>

        {/* ── Member workload ──────────────────────────────────────── */}
        <h2>Team workload</h2>
        {Object.entries(workloadByJob).map(([jobKey, peeps]) => (
          <div key={jobKey} style={{ marginBottom: 14 }} className="task-group">
            <h3>{jobKey === 'UNASSIGNED' ? 'No job role' : jobKey} <span className="muted mono" style={{ fontSize: 10 }}>· {peeps.length}</span></h3>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'right' }}>Tasks</th>
                  <th style={{ textAlign: 'right' }}>Done</th>
                  <th style={{ textAlign: 'right' }}>Est.</th>
                  <th style={{ textAlign: 'right' }}>Logged</th>
                </tr>
              </thead>
              <tbody>
                {peeps.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}<div className="muted mono" style={{ fontSize: 10 }}>{m.email}</div></td>
                    <td className="muted">{m.role === 'OWNER' ? 'Manager' : 'Member'}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{m.assignedCount}</td>
                    <td className="mono" style={{ textAlign: 'right', color: '#10b981' }}>{m.doneCount}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{m.estHours}h</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{m.logHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* ── Task list grouped by status ──────────────────────────── */}
        <h2>Tasks</h2>
        {Object.entries(groupedTasks).map(([statusKey, group]) => {
          if (group.length === 0) return null;
          const s = STATUS[statusKey];
          return (
            <div key={statusKey} className="task-group">
              <h3>
                <StatusDot status={statusKey} /> {s.label} <span className="muted mono" style={{ fontSize: 10 }}>· {group.length}</span>
              </h3>
              <ul className="task-list">
                {group.map((t) => {
                  const assignee = t.assigneeId ? memberById.get(t.assigneeId) : null;
                  const logged = hours(t.loggedMinutes);
                  const est = hours(t.estimatedMinutes);
                  return (
                    <li key={t.id} className="task-row">
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span className="title">{t.title}</span>
                        <span className="mono muted" style={{ fontSize: 10 }}>#{t.id.slice(-5).toUpperCase()}</span>
                        {t.isBlocked && t.blockedBy?.[0] && (
                          <span className="lock">🔒 Waiting on: {t.blockedBy[0].blockerTitle}</span>
                        )}
                        <span className="mono muted" style={{ marginLeft: 'auto', fontSize: 10.5 }}>
                          {assignee ? `${assignee.name} · ` : ''}{logged}h / {est}h
                          {t.dueDate ? ` · due ${formatDate(t.dueDate)}` : ''}
                        </span>
                      </div>
                      {t.subtasks.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 4px' }}>
                          {t.subtasks.map((s2) => {
                            const sa = s2.assigneeId ? memberById.get(s2.assigneeId) : null;
                            return (
                              <li key={s2.id} className="subrow">
                                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                  <StatusDot status={s2.status} />
                                  <span>{s2.title}</span>
                                  {s2.isBlocked && s2.blockedBy?.[0] && (
                                    <span className="lock">🔒 {s2.blockedBy[0].blockerTitle}</span>
                                  )}
                                  <span className="mono muted" style={{ marginLeft: 'auto', fontSize: 10 }}>
                                    {sa ? `${sa.name} · ` : ''}{hours(s2.loggedMinutes)}h / {hours(s2.estimatedMinutes)}h
                                  </span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {summary.total === 0 && <p className="muted">No tasks yet in this project.</p>}

        <div className="footer">
          Exported by {exporter.name} · {formatDateTime(exportedAt)} · WhatTheTxxk
        </div>
      </div>
    </>
  );
}
