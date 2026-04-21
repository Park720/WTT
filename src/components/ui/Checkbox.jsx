'use client';

const TONE_CLASSES = {
  brand:   { bg: 'bg-orange-500',  border: 'border-orange-500' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500' },
};

export default function Checkbox({ checked, onChange, size = 16, tone = 'brand', disabled = false }) {
  const c = TONE_CLASSES[tone] ?? TONE_CLASSES.brand;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange?.(!checked); }}
      className={`inline-flex items-center justify-center rounded-[5px] border transition-all shrink-0
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? `${c.bg} ${c.border}` : 'bg-white border-slate-300 hover:border-slate-400'}`}
      style={{ width: size, height: size }}
      aria-checked={checked}
      role="checkbox"
      disabled={disabled}
    >
      {checked && (
        <svg viewBox="0 0 16 16" width={size * 0.78} height={size * 0.78} className="check">
          <path
            d="M3.5 8.5 L7 12 L13 4.5"
            stroke="white" strokeWidth="2.2"
            fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
