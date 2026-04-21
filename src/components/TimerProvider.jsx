'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export const TIMER_MODES = {
  focus: { key: 'focus', label: 'Focus',       minutes: 25 },
  short: { key: 'short', label: 'Short break', minutes: 5  },
  long:  { key: 'long',  label: 'Long break',  minutes: 15 },
};

const TimerContext = createContext(null);

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within <TimerProvider>');
  return ctx;
}

export default function TimerProvider({ children }) {
  const [mode, setMode]             = useState('focus');
  const [activeSession, setActive]  = useState(null); // { id, taskId, taskTitle, projectId, duration, startedAt }
  const [remainingSec, setRem]      = useState(TIMER_MODES.focus.minutes * 60);
  const [running, setRunning]       = useState(false);
  const [completedSessions, setCompleted] = useState(0);
  const hydratedRef = useRef(false);

  // ── Hydrate from server on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/timer/active', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        hydratedRef.current = true;
        if (!data || cancelled) return;
        const total = data.duration * 60;
        const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, total - elapsed);
        setActive(data);
        setMode('focus');
        setRem(remaining);
        setRunning(remaining > 0);
      } catch {
        hydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRem((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // When countdown hits 0 naturally, auto-end the session and bump the counter.
  useEffect(() => {
    if (remainingSec !== 0 || !running) return;
    setRunning(false);
    setCompleted((n) => n + 1);
    if (activeSession) {
      fetch(`/api/timer/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      }).catch(() => {});
      setActive(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const startFocus = useCallback(async ({ id, title, projectId, duration }) => {
    const minutes = duration ?? TIMER_MODES.focus.minutes;
    const res = await fetch(`/api/tasks/${id}/timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: minutes }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to start focus session');
    }
    const data = await res.json();
    setActive({ ...data, taskTitle: data.taskTitle ?? title, projectId: data.projectId ?? projectId });
    setMode('focus');
    setRem(minutes * 60);
    setRunning(true);
  }, []);

  const pause  = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => { if (remainingSec > 0) setRunning(true); }, [remainingSec]);

  const reset = useCallback(() => {
    setRunning(false);
    setRem(TIMER_MODES[mode].minutes * 60);
  }, [mode]);

  const skip = useCallback(async () => {
    if (activeSession) {
      fetch(`/api/timer/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {});
      setActive(null);
    }
    setRunning(false);
    setRem(TIMER_MODES[mode].minutes * 60);
    setCompleted((n) => n + 1);
  }, [activeSession, mode]);

  const changeMode = useCallback(async (nextMode) => {
    if (!TIMER_MODES[nextMode]) return;
    setMode(nextMode);
    setRunning(false);
    setRem(TIMER_MODES[nextMode].minutes * 60);
    // Switching away from focus ends the active DB session
    if (activeSession && nextMode !== 'focus') {
      fetch(`/api/timer/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {});
      setActive(null);
    }
  }, [activeSession]);

  const endSession = useCallback(async ({ markDone = false } = {}) => {
    if (!activeSession) {
      setRunning(false);
      setRem(TIMER_MODES[mode].minutes * 60);
      return;
    }
    await fetch(`/api/timer/${activeSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markDone }),
    });
    setActive(null);
    setRunning(false);
    setRem(TIMER_MODES[mode].minutes * 60);
  }, [activeSession, mode]);

  const value = {
    mode, modes: TIMER_MODES,
    activeSession, running, remainingSec, completedSessions,
    startFocus, pause, resume, reset, skip, changeMode, endSession,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
