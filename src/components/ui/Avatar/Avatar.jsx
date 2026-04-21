import styles from './Avatar.module.css';

function deriveHue(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function deriveInitials(name = '?') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Avatar({ user, size = 28, ring = false }) {
  const name = user?.name ?? '?';
  const hue = user?.hue ?? deriveHue(name);
  const initials = user?.initials ?? deriveInitials(name);
  const bg = `hsl(${hue} 70% 88%)`;
  const fg = `hsl(${hue} 55% 26%)`;

  return (
    <span
      title={name}
      className={`${styles.avatar}${ring ? ` ${styles.ring}` : ''}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.max(10, size * 0.42),
      }}
    >
      {initials}
    </span>
  );
}
