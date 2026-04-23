'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui';
import useEscape from '@/hooks/useEscape';
import styles from './DeleteProjectDialog.module.css';

export default function DeleteProjectDialog({ project, onClose, onDeleted }) {
  useEscape(onClose);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');

  const matches = confirm.trim() === project.name.trim();
  const disabled = busy || !matches;

  async function handleDelete() {
    if (disabled) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete project');
      }
      onDeleted?.(project);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconCircle}>
          <Icon.Bin className="w-5 h-5" />
        </div>
        <h2 className={styles.title}>Delete this project?</h2>
        <p className={styles.body}>
          All tasks, subtasks, timer sessions, and notifications in{' '}
          <span className={styles.projectName}>&ldquo;{project.name}&rdquo;</span>{' '}
          will be permanently deleted. This cannot be undone.
        </p>

        <label className={styles.confirmLabel} htmlFor="delete-project-confirm">
          Type the project name to confirm
        </label>
        <input
          id="delete-project-confirm"
          className={styles.confirmInput}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={project.name}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={disabled}
            className={styles.deleteBtn}
          >
            {busy ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
