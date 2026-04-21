export default function CircularProgress({
  value = 0,
  size = 44,
  stroke = 4,
  label,
  sub,
  color = '#f97316',
  track = '#f1f5f9',
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col leading-none">
        {label !== undefined && (
          <span className="font-mono text-[11px] font-medium text-slate-800">{label}</span>
        )}
        {sub && (
          <span className="font-mono text-[9px] text-slate-500 mt-0.5">{sub}</span>
        )}
      </div>
    </div>
  );
}
