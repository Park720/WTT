export function formatMinutes(mins) {
  if (!mins || mins === 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Treat a dueDate stored at exactly `T00:00:00.000Z` as "date-only" —
 * the Planner's date input serializes that way when no time is picked.
 */
export function isDateOnlyDueDate(iso) {
  if (!iso) return false;
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.getUTCHours() === 0
      && d.getUTCMinutes() === 0
      && d.getUTCSeconds() === 0
      && d.getUTCMilliseconds() === 0;
}

/**
 * "Apr 23, 2026" for a date-only dueDate, "Apr 23, 2026 at 2:30 PM" when
 * the user picked a specific time. Date-only values are formatted against
 * the UTC calendar so timezone offsets don't shift the displayed day.
 */
export function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isDateOnlyDueDate(d)) {
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      timeZone: 'UTC',
    });
  }
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Pull the YYYY-MM-DD and HH:MM components out of a stored dueDate for
 * use in <input type="date"> / <input type="time"> fields. Returns empty
 * strings for nullish input, and an empty time component for date-only
 * values so the time input stays blank.
 */
export function splitDueDateForInputs(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  if (isDateOnlyDueDate(d)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return { date: `${y}-${m}-${day}`, time: '' };
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` };
}

/**
 * Combine a date input (YYYY-MM-DD, local) with an optional time input
 * (HH:MM, local) into an ISO string suitable for API submission.
 * - No date → null
 * - Date + time → local datetime converted to UTC ISO
 * - Date only  → UTC-midnight sentinel (`YYYY-MM-DDT00:00:00.000Z`)
 *   so downstream code can render it at a sensible default (09:00 local).
 */
export function combineDueDateInputs(dateStr, timeStr) {
  if (!dateStr) return null;
  if (!timeStr) return `${dateStr}T00:00:00.000Z`;
  const local = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(local.getTime())) return `${dateStr}T00:00:00.000Z`;
  return local.toISOString();
}
