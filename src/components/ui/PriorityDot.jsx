import { PRIORITY } from './constants';

export default function PriorityDot({ priority, withLabel = false }) {
  const pr = PRIORITY[priority] ?? PRIORITY.MEDIUM;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pr.color }} />
      {withLabel && pr.label}
    </span>
  );
}
