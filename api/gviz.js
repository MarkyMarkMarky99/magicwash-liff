/**
 * Vercel Serverless Function — Generic GViz proxy
 *
 * Hides spreadsheet IDs server-side; clients pass source + sheet + tq only.
 *
 * Query params:
 *   source - spreadsheet alias: "orders" (default) | "customers"
 *   sheet  - sheet name (e.g. "LaundryPhotos", "Customers")
 *   tq     - GViz SQL query (e.g. "SELECT F,G WHERE B='ORD-001'")
 *
 * Returns: JSON array of row objects, one key per selected column (c0, c1, ...)
 *   e.g. [{ c0: "https://...", c1: "label" }, ...]
 */
const SPREADSHEET_MAP = {
  orders:    process.env.GVIZ_SPREADSHEET_ID,
  customers: process.env.GVIZ_CUSTOMERS_SPREADSHEET_ID,
  portal:    process.env.GVIZ_PORTAL_SPREADSHEET_ID,
};

export default async function handler(req, res) {
  const { source = 'orders', sheet, tq } = req.query;

  if (!sheet || !tq) {
    return res.status(400).json({ error: 'sheet and tq are required' });
  }

  const spreadsheetId = SPREADSHEET_MAP[source];
  if (!spreadsheetId) {
    return res.status(source in SPREADSHEET_MAP ? 500 : 400).json({
      error: source in SPREADSHEET_MAP
        ? `Spreadsheet ID for "${source}" is not configured`
        : `Unknown source "${source}". Valid values: ${Object.keys(SPREADSHEET_MAP).join(', ')}`,
    });
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
    `?sheet=${encodeURIComponent(sheet)}` +
    `&tq=${encodeURIComponent(tq)}` +
    `&tqx=out:json`;

  const gvizRes = await fetch(url);
  if (!gvizRes.ok) {
    return res.status(502).json({ error: `GViz responded ${gvizRes.status}` });
  }

  const text = await gvizRes.text();
  const json = JSON.parse(text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, ''));

  const rows = (json?.table?.rows ?? []).map((row) => {
    const obj = {};
    (row.c ?? []).forEach((cell, i) => {
      obj[`c${i}`] = cell?.v ?? null;
    });
    return obj;
  });

  res.status(200).json(rows);
}
