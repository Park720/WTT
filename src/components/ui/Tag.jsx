const TONE_CLASSES = {
  slate:   'bg-slate-100 text-slate-700',
  brand:   'bg-orange-50 text-orange-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber:   'bg-amber-50 text-amber-700',
  sky:     'bg-sky-50 text-sky-700',
  violet:  'bg-violet-50 text-violet-700',
};

export default function Tag({ children, tone = 'slate', dot }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${TONE_CLASSES[tone] ?? TONE_CLASSES.slate}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />}
      {children}
    </span>
  );
}
