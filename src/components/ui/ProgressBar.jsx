const TONE_CLASSES = {
  brand:   'bg-orange-500',
  emerald: 'bg-emerald-500',
  slate:   'bg-slate-400',
};

export default function ProgressBar({ value = 0, tone = 'brand' }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${TONE_CLASSES[tone] ?? TONE_CLASSES.brand}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
