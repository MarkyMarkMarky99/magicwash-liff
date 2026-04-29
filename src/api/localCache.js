export const TTL_24H = 24 * 60 * 60 * 1000;

/**
 * Like lsGet but returns stale entries instead of deleting them.
 * Used for Stale-While-Revalidate: show old data immediately while fetching fresh.
 * @returns {{ value: any|null, isStale: boolean }}
 */
export function lsGetStale(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { value: null, isStale: false };
    const { value, expiresAt } = JSON.parse(raw);
    return { value, isStale: Date.now() > expiresAt };
  } catch {
    return { value: null, isStale: false };
  }
}

export function lsGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { value, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function lsSet(key, value, ttl = TTL_24H) {
  try {
    localStorage.setItem(key, JSON.stringify({
      value,
      expiresAt: Date.now() + ttl,
    }));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function lsClear(key) {
  try { localStorage.removeItem(key); } catch { /* fail silently */ }
}

// --- GViz query helpers ---

/** Escape a value for use inside a GViz string literal (single-quote delimited). */
export const gvizStr = (s) => String(s).replace(/'/g, "''");

// --- HTTP helpers ---

export const cacheKey = (resource, id) => `mw:${resource}:${id}`;

export async function apiPost(table, payload) {
  const res = await fetch('/api/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, payload }),
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error(message);
  }
  return res.json();
}

export async function fetchAndCache(url, key, transform = (r) => r) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  const result = rows.map(transform);
  if (result.length) lsSet(key, result);
  return result;
}

export function gvizSwrFetch(source, tq, id, transform = (r) => r, onRevalidate, cols) {
  let url = `/api/gviz?source=${encodeURIComponent(source)}&tq=${encodeURIComponent(tq)}`;
  if (cols) url += `&cols=${encodeURIComponent(cols)}`;
  return swrFetch(url, cacheKey(source, id), transform, onRevalidate);
}

export async function swrFetch(url, key, transform = (r) => r, onRevalidate) {
  const { value, isStale } = lsGetStale(key);
  if (value) {
    if (isStale) {
      const fresh = fetchAndCache(url, key, transform);
      if (onRevalidate) fresh.then(onRevalidate).catch(() => {});
    }
    return value;
  }
  return fetchAndCache(url, key, transform);
}
