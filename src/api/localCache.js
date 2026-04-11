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
