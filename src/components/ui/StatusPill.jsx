import { STATUS } from './constants';

const TONE_CLASSES = {
  slate:   'bg-slate-100 text-slate-700 border-slate-200',
  brand:   'bg-orange-50 text-orange-700 border-orange-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  zinc:    'bg-slate-100 text-slate-600 border-slate-200',
};

const SIZE_CLASSES = {
  sm: 'text-[11px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
};

export default function StatusPill({ status, size = 'md' }) {
  const st = STATUS[status] ?? STATUS.TODO;
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${TONE_CLASSES[st.tone]} ${SIZE_CLASSES[size]}`}>
      <span aria-hidden>{st.icon}</span>
      {st.label}
    </span>
  );
}
