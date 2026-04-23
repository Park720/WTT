import styles from './Logo.module.css';

export default function Logo({ size = 18, dark = false, withText = true }) {
  const markSize = size * 1.45;
  return (
    <span className={styles.wrapper} style={{ fontSize: size }}>
      <span className={styles.mark} style={{ width: markSize, height: markSize }}>
        <svg viewBox="0 0 32 32" width={markSize} height={markSize} className={styles.waka}>
          <defs>
            <linearGradient id="wakaG" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#fb923c" />
              <stop offset="1" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <path className={styles.mouth} d="M16 2 A14 14 0 1 1 4.8 23.2 L16 16 Z" fill="url(#wakaG)" />
          <circle cx="19" cy="10" r="1.6" fill="#fff" />
        </svg>
      </span>
      {withText && (
        <span className={dark ? styles.textDark : styles.text}>
          WhatThe<span className={styles.accent}>Txxk</span>
        </span>
      )}
    </span>
  );
}
