export const STATUS = {
  TODO:           { key: 'TODO',           label: 'To do',          icon: '⬜', tone: 'slate',   swatch: '#cbd5e1' },
  IN_PROGRESS:    { key: 'IN_PROGRESS',    label: 'In progress',    icon: '🔄', tone: 'brand',   swatch: '#f97316' },
  PENDING_REVIEW: { key: 'PENDING_REVIEW', label: 'Pending review', icon: '⏳', tone: 'amber',   swatch: '#f59e0b' },
  DONE:           { key: 'DONE',           label: 'Done',           icon: '✅', tone: 'emerald', swatch: '#10b981' },
  BLOCKED:        { key: 'BLOCKED',        label: 'Blocked',        icon: '🔒', tone: 'zinc',    swatch: '#64748b' },
};

export const PRIORITY = {
  HIGH:   { label: 'High',   color: '#ef4444' },
  MEDIUM: { label: 'Medium', color: '#f59e0b' },
  LOW:    { label: 'Low',    color: '#3b82f6' },
};

export const JOB_LABELS = {
  UX_ART:      'UX & Art',
  PROGRAMMING: 'Programming',
  DESIGNER:    'Designer',
  PUBLISHER:   'Publisher',
};
