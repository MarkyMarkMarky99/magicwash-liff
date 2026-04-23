import { lsGet, lsSet } from './localCache';

const CACHE_PREFIX = 'mw_photos_';
const SHEET_NAME = 'LaundryPhotos';

function toDirectUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'drive.google.com' && u.pathname === '/thumbnail') {
      const id = u.searchParams.get('id');
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
  } catch { /* not a valid URL, return as-is */ }
  return url;
}

/**
 * Fetch laundry photos for a given orderId via the /api/gviz proxy.
 * Sheet columns: B=orderId, F=image_url, G=image_label
 * @param {string} orderId
 * @returns {Promise<Array<{ imageUrl: string, label: string }>>}
 */
export async function getPhotosByOrderId(orderId) {
  const cached = lsGet(CACHE_PREFIX + orderId);
  if (cached) {
    console.log('[gvizApi] cache hit:', orderId);
    return cached;
  }

  const tq = `SELECT F,G WHERE B='${orderId}'`;
  const res = await fetch(
    `/api/gviz?sheet=${encodeURIComponent(SHEET_NAME)}&tq=${encodeURIComponent(tq)}`
  );
  if (!res.ok) throw new Error(`photos API responded ${res.status}`);

  const rows = await res.json();
  const photos = rows
    .map((row) => ({
      imageUrl: toDirectUrl(row.c0),
      label: row.c1 ?? '',
    }))
    .filter((item) => item.imageUrl);

  if (photos.length > 0) lsSet(CACHE_PREFIX + orderId, photos);
  return photos;
}
