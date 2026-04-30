'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Icon } from '@/components/ui';

const ToastContext = createContext({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const type = opts.type ?? 'info';
    const duration = opts.duration ?? 3000;
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const value = { show };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-20 right-5 z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES = {
  info:    { bg: 'bg-slate-900',    text: 'text-white', Icon: Icon.Sparkle },
  success: { bg: 'bg-emerald-500',  text: 'text-white', Icon: Icon.Check },
  error:   { bg: 'bg-red-500',      text: 'text-white', Icon: Icon.X },
};

function ToastItem({ toast }) {
  const s = STYLES[toast.type] ?? STYLES.info;
  const IconCmp = s.Icon;
  return (
    <div
      className={`px-4 py-2 rounded-xl shadow-lift-lg text-[15.5px] font-medium pointer-events-auto flex items-center gap-2 ${s.bg} ${s.text} page-enter`}
    >
      <IconCmp className="w-3.5 h-3.5 shrink-0" />
      <span>{toast.message}</span>
    </div>
  );
}
