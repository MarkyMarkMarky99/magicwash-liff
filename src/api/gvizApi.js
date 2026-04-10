/**
 * Convert drive.google.com/thumbnail?id=XXX to lh3.googleusercontent.com/d/XXX
 * The lh3 URL is a direct CDN link that works in <img> without Google session cookies.
 */
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

const SPREADSHEET_ID = '1tfgJvjXMkH8MIoJ38No9-1DBdG7o0lcPG8dVhPCGw-E';
const SHEET_NAME = 'LaundryPhotos';

/**
 * Fetch laundry photos for a given orderId from Google Sheets via GVIZ.
 * Sheet columns: B=orderId, F=image_url, G=image_label
 * @param {string} orderId
 * @returns {Promise<Array<{ imageUrl: string, label: string }>>}
 */
const cache = new Map();

export async function getPhotosByOrderId(orderId) {
  if (cache.has(orderId)) {
    console.log('[gvizApi] cache hit:', orderId);
    return cache.get(orderId);
  }
  const query = `SELECT F,G WHERE B='${orderId}'`;
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`
    + `?sheet=${encodeURIComponent(SHEET_NAME)}`
    + `&tq=${encodeURIComponent(query)}`
    + `&tqx=out:json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`GVIZ responded ${res.status}`);

  const text = await res.text();
  // Strip GVIZ callback wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const json = JSON.parse(text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, ''));

  const rows = json?.table?.rows ?? [];
  return rows
    .map((row) => ({
      imageUrl: toDirectUrl(row.c?.[0]?.v ?? null),
      label:    row.c?.[1]?.v ?? '',
    }))
    .filter((item) => item.imageUrl);
}
