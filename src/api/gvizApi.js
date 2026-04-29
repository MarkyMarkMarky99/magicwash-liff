import { gvizSwrFetch, gvizStr } from './localCache';

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

function transformPhoto(row) {
  return { imageUrl: toDirectUrl(row.imageUrl), label: row.notes ?? '' };
}

export async function getPhotosByOrderId(orderId, onRevalidate) {
  const rows = await gvizSwrFetch(
    'photos',
    `SELECT * WHERE B='${gvizStr(orderId)}'`,
    orderId,
    transformPhoto,
    onRevalidate ? (rows) => onRevalidate(rows.filter((r) => r.imageUrl)) : null,
    'imageUrl,notes',
  );
  return rows.filter((r) => r.imageUrl);
}
