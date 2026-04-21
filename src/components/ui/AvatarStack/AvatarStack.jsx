import Avatar from '../Avatar/Avatar';
import styles from './AvatarStack.module.css';

export default function AvatarStack({ users = [], size = 26, max = 4 }) {
  const show = users.slice(0, max);
  const extra = Math.max(0, users.length - max);

  return (
    <div className={styles.stack}>
      {show.map((user, i) => (
        <div key={user?.id ?? i} className={styles.item} style={{ zIndex: 10 - i }}>
          <Avatar user={user} size={size} ring />
        </div>
      ))}
      {extra > 0 && (
        <span
          className={styles.overflow}
          style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
