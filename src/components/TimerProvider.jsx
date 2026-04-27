'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/Toaster';
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

const MIN_TOTAL_SEC = 5 * 60;
const MAX_TOTAL_SEC = 120 * 60;

export default function TimerProvider({ children }) {
  const [mode, setMode]             = useState('focus');
  const [activeSession, setActive]  = useState(null); // { id, taskId, taskTitle, projectId, duration, startedAt }
  const [totalSec, setTotalSec]     = useState(TIMER_MODES.focus.minutes * 60);
  const [remainingSec, setRem]      = useState(TIMER_MODES.focus.minutes * 60);
  const [running, setRunning]       = useState(false);
  const [completedSessions, setCompleted] = useState(0);
  const [heartbeatTick, setHeartbeatTick] = useState(0);
  const hydratedRef = useRef(false);
  const { setCustomMinutes } = useTimer();
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
        setTotalSec(total);
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

  // ── Heartbeat (every 60s while running with an active DB session) ────────
  useEffect(() => {
    if (!running || !activeSession) return;
    const id = setInterval(() => {
      fetch(`/api/timer/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heartbeat: true }),
      })
        .then((res) => {
          if (res.ok) setHeartbeatTick((n) => n + 1);
        })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [running, activeSession]);
const toast = useToast();
  // When countdown hits 0 naturally, auto-end the session and bump the counter.
  useEffect(() => {
  if (remainingSec !== 0 || !running) return;

  setRunning(false);

  toast.show('Timer done! Nice work.', {
    type: 'success',
    duration: 5000,
  });

  setCompleted((n) => n + 1);

  if (activeSession) {
    fetch(`/api/timer/${activeSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    }).catch(() => {});

    setActive(null);
  }
}, [remainingSec, running, activeSession, toast]);

  // ── Actions ───────────────────────────────────────────────────────────────
function setCustomMinutes(minutes) {
  const mins = Number(minutes);

  if (!mins || mins <= 0) return;

  setDurationSec(mins * 60);
  setRemainingSec(mins * 60);
  setRunning(false);
}
  const startFocus = useCallback(async ({ id, title, projectId, duration }) => {
    const minutes = duration ?? Math.floor(totalSec / 60);
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
    setTotalSec(minutes * 60);
    setRem(minutes * 60);
    setRunning(true);
  }, [totalSec]);

  const pause  = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => { if (remainingSec > 0) setRunning(true); }, [remainingSec]);

  const reset = useCallback(() => {
    setRunning(false);
    setRem(totalSec);
  }, [totalSec]);

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
    setTotalSec(TIMER_MODES[mode].minutes * 60);
    setRem(TIMER_MODES[mode].minutes * 60);
    setCompleted((n) => n + 1);
  }, [activeSession, mode]);

  const changeMode = useCallback(async (nextMode) => {
    if (!TIMER_MODES[nextMode]) return;
    setMode(nextMode);
    setRunning(false);
    setTotalSec(TIMER_MODES[nextMode].minutes * 60);
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
      setTotalSec(TIMER_MODES[mode].minutes * 60);
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
    setTotalSec(TIMER_MODES[mode].minutes * 60);
    setRem(TIMER_MODES[mode].minutes * 60);
  }, [activeSession, mode]);
  // Flat implementation (no nested setState updaters). React StrictMode
  // double-invokes state updater functions, so nesting a `setRem` call
  // inside a `setTotalSec` updater caused the delta to apply twice.
  const addMinutes = useCallback((delta) => {
    const deltaSec = delta * 60;
    const newTotal = Math.max(MIN_TOTAL_SEC, Math.min(MAX_TOTAL_SEC, totalSec + deltaSec));
    const actualDelta = newTotal - totalSec;
    if (actualDelta === 0) return;

    setTotalSec(newTotal);
    // Shift remaining by the same delta so elapsed time stays constant.
    setRem((prevRem) => Math.max(0, Math.min(newTotal, prevRem + actualDelta)));

    if (activeSession) {
      const newMinutes = newTotal / 60;
      fetch(`/api/timer/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: newMinutes }),
      }).catch(() => {});
      setActive({ ...activeSession, duration: newMinutes });
    }
  }, [totalSec, activeSession]);

  const value = {
    mode, modes: TIMER_MODES,
    activeSession, running, totalSec, remainingSec, completedSessions,
    heartbeatTick,
    startFocus, pause, resume, reset, skip, changeMode, endSession, addMinutes, setCustomMinutes,
    MIN_TOTAL_SEC, MAX_TOTAL_SEC,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
