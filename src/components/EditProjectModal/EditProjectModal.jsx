'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui';
import useEscape from '@/hooks/useEscape';
import styles from './EditProjectModal.module.css';

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
  '#ec4899', '#f59e0b', '#6366f1', '#ef4444',
];

export default function EditProjectModal({ project, onClose, onSaved }) {
  useEscape(onClose);
  const [name, setName]               = useState(project.name ?? '');
  const [description, setDescription] = useState(project.description ?? '');
  const [color, setColor]             = useState(project.color ?? PRESET_COLORS[0]);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState('');

  const disabled = busy || !name.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), color }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save project');
      }
      const updated = await res.json();
      onSaved?.(updated);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Edit project</h2>
            <p className={styles.subtitle}>Update the basics for &ldquo;{project.name}&rdquo;.</p>
          </div>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
            <Icon.X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-project-name">Project name</label>
            <input
              id="edit-project-name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-project-description">
              Description <span style={{ color: 'var(--slate-400)' }}>(optional)</span>
            </label>
            <textarea
              id="edit-project-description"
              className={styles.textarea}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Color</label>
            <div className={styles.swatchRow}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={color === c}
                  className={`${styles.swatch}${color === c ? ` ${styles.swatchActive}` : ''}`}
                  style={{ background: c }}
                />
              ))}
              <div className={styles.customColorWrap}>
                <span>custom</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Custom color"
                  className={styles.customColor}
                />
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={disabled} className={styles.submitBtn}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
