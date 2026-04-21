import styles from './CircularProgress.module.css';

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
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.ring}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className={styles.arc}
        />
      </svg>
      <div className={styles.label}>
        {label !== undefined && <span className={styles.value}>{label}</span>}
        {sub && <span className={styles.sub}>{sub}</span>}
      </div>
    </div>
  );
}
