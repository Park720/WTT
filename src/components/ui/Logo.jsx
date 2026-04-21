export default function Logo({ size = 18, dark = false, withText = true }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="relative inline-flex items-center justify-center" style={{ width: size * 1.45, height: size * 1.45 }}>
        <svg viewBox="0 0 32 32" width={size * 1.45} height={size * 1.45} className="waka">
          <defs>
            <linearGradient id="wakaG" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#fb923c" />
              <stop offset="1" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <path d="M16 2 A14 14 0 1 1 4.8 23.2 L16 16 Z" fill="url(#wakaG)" />
          <circle cx="19" cy="10" r="1.6" fill="#fff" />
        </svg>
      </span>
      {withText && (
        <span className={dark ? 'text-white' : 'text-slate-900'}>
          WhatThe<span className="text-orange-500">Txxk</span>
        </span>
      )}
    </span>
  );
}
