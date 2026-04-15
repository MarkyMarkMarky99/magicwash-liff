/**
 * Parses a date string that may be in DD/MM/YYYY (Google Sheets) or ISO format.
 * @param {string|null|undefined} raw
 * @returns {Date|null}
 */
export function parseSheetDate(raw) {
  if (!raw) return null;
  const parts = String(raw).split('/');
  const d = parts.length === 3
    ? new Date(parts[2], parts[1] - 1, parts[0])
    : new Date(raw);
  return isNaN(d) ? null : d;
}

/**
 * Converts a raw date string to an ISO date string (YYYY-MM-DD).
 * Used by the API layer to normalise dates before caching.
 * Returns the original value unchanged if it cannot be parsed.
 * @param {string|null|undefined} raw
 * @returns {string|null|undefined}
 */
export function toISODate(raw) {
  if (!raw) return raw;
  const d = parseSheetDate(raw);
  if (!d) return raw;
  // Format as YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a date value for display.
 * Accepts ISO strings, DD/MM/YYYY, or Date objects.
 * @param {string|Date|null|undefined} val
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function formatDisplayDate(val, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!val) return '—';
  const d = val instanceof Date ? val : parseSheetDate(String(val));
  if (!d) return String(val);
  return d.toLocaleDateString('th-TH-u-ca-gregory', opts);
}
