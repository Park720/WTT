import { useEffect } from 'react';

/**
 * Invoke the callback when the user presses Escape. Designed for modal
 * dismissal — returns a cleanup that removes the listener.
 */
export default function useEscape(onEscape, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => { if (e.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}
