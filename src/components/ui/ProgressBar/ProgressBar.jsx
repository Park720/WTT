import styles from './ProgressBar.module.css';

export default function ProgressBar({ value = 0, tone = 'brand' }) {
  const toneClass = styles[tone] ?? styles.brand;
  const width = `${Math.min(100, Math.max(0, value))}%`;
  return (
    <div className={styles.track}>
      <div className={`${styles.fill} ${toneClass}`} style={{ width }} />
    </div>
  );
}
