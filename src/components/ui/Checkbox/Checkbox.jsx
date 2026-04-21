'use client';

import styles from './Checkbox.module.css';

export default function Checkbox({ checked, onChange, size = 16, tone = 'brand', disabled = false }) {
  const toneClass = checked ? (styles[tone] ?? styles.brand) : '';
  const className = [
    styles.box,
    toneClass,
    disabled ? styles.disabled : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange?.(!checked); }}
      className={className}
      style={{ width: size, height: size }}
      aria-checked={checked}
      role="checkbox"
      disabled={disabled}
    >
      {checked && (
        <svg viewBox="0 0 16 16" width={size * 0.78} height={size * 0.78} className={styles.check}>
          <path
            d="M3.5 8.5 L7 12 L13 4.5"
            stroke="white" strokeWidth="2.2"
            fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
