import styles from './Tag.module.css';

export default function Tag({ children, tone = 'slate', dot }) {
  const toneClass = styles[tone] ?? styles.slate;
  return (
    <span className={`${styles.tag} ${toneClass}`}>
      {dot && <span className={styles.dot} style={{ background: dot }} />}
      {children}
    </span>
  );
}
