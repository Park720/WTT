import { PRIORITY } from '../constants';
import styles from './PriorityDot.module.css';

export default function PriorityDot({ priority, withLabel = false }) {
  const pr = PRIORITY[priority] ?? PRIORITY.MEDIUM;
  return (
    <span className={styles.wrapper}>
      <span className={styles.dot} style={{ background: pr.color }} />
      {withLabel && pr.label}
    </span>
  );
}
