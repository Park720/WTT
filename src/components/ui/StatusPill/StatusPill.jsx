import { STATUS } from '../constants';
import styles from './StatusPill.module.css';

export default function StatusPill({ status, size = 'md' }) {
  const st = STATUS[status] ?? STATUS.TODO;
  const toneClass = styles[st.tone] ?? styles.slate;
  const sizeClass = styles[size] ?? styles.md;
  return (
    <span className={`${styles.pill} ${toneClass} ${sizeClass}`}>
      <span aria-hidden>{st.icon}</span>
      {st.label}
    </span>
  );
}
