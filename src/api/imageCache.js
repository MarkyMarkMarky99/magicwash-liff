const CACHE_NAME = 'mw-images-v1';
const MAX_RETRIES = 3;

/**
 * Check if url is already in Cache API without fetching.
 * Returns blob: URL if found, null if not.
 * Caller is responsible for revoking the blob URL via URL.revokeObjectURL().
 */
export async function peekImageCache(url) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (!hit) return null;
  return URL.createObjectURL(await hit.blob());
}

/**
 * Fetch an image URL with Cache API storage and exponential backoff on 429.
 * Returns a blob: URL suitable for <img src>.
 * Caller is responsible for revoking the blob URL via URL.revokeObjectURL().
 */
export async function fetchCachedImage(url) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (hit) {
    return URL.createObjectURL(await hit.blob());
  }

  let delay = 2000;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      await cache.put(url, res.clone());
      return URL.createObjectURL(await res.blob());
    }
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  }
}
