'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';

const NOTIF_STYLE = {
  ASSIGNED:            { wrap: 'bg-orange-50 text-orange-600',   icon: 'User' },
  COMPLETION_REQUEST:  { wrap: 'bg-amber-50 text-amber-600',     icon: 'Timer' },
  STATUS_CHANGE:       { wrap: 'bg-emerald-50 text-emerald-600', icon: 'Check' },
  DEPENDENCY_UNLOCKED: { wrap: 'bg-sky-50 text-sky-600',         icon: 'Lock' },
  DEADLINE:            { wrap: 'bg-red-50 text-red-600',         icon: 'Bell' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationRow({ n, onClick }) {
  const style = NOTIF_STYLE[n.type] ?? NOTIF_STYLE.ASSIGNED;
  const IconCmp = Icon[style.icon];
  const clickable = !!n.projectId;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 transition-colors
        ${clickable ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}
        ${!n.isRead ? 'bg-orange-50/30' : ''}`}
    >
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${style.wrap}`}>
        <IconCmp className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] leading-snug text-slate-800 line-clamp-2">{n.message}</p>
        <p className="text-[11px] font-mono text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.isRead && (
        <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" aria-label="Unread" />
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-14 flex flex-col items-center text-center">
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-400 mb-3">
        <Icon.Bell className="w-5 h-5" />
      </span>
      <p className="text-[15.5px] font-medium text-slate-700">No notifications yet</p>
      <p className="text-[11.5px] text-slate-500 mt-0.5">You'll see activity here once things happen.</p>
    </div>
  );
}

export default function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — don't spam console for transient fetch failures
    }
  }, []);

  // Initial fetch so the badge shows even when the panel is closed
  useEffect(() => {
    setLoading(true);
    fetchNotifs().finally(() => setLoading(false));
  }, [fetchNotifs]);

  // Poll every 30s while the panel is open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [open, fetchNotifs]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifs();
  }

  async function handleRowClick(n) {
    if (!n.isRead) {
      setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' }).catch(() => {});
    }
    if (n.projectId) {
      setOpen(false);
      const target = n.taskId
        ? `/project/${n.projectId}/planner?task=${n.taskId}`
        : `/project/${n.projectId}/planner`;
      router.push(target);
    }
  }

  async function handleMarkAll() {
    setNotifs((ns) => ns.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
    } catch {
      // swallow
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <Icon.Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-medium font-mono flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[400px] rounded-2xl bg-white shadow-lift-lg border border-slate-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[16.5px] font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-[11.5px] text-orange-500 hover:text-orange-600 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto nice-scroll">
            {loading && notifs.length === 0 ? (
              <div className="px-6 py-10 text-center text-[15px] text-slate-400">Loading…</div>
            ) : notifs.length === 0 ? (
              <EmptyState />
            ) : (
              notifs.map((n) => (
                <NotificationRow key={n.id} n={n} onClick={() => handleRowClick(n)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
