/**
 * Vercel Serverless Function — Generic GViz proxy
 *
 * Hides GVIZ_SPREADSHEET_ID server-side; clients pass sheet + tq only.
 *
 * Query params:
 *   sheet  - sheet name (e.g. "LaundryPhotos")
 *   tq     - GViz SQL query (e.g. "SELECT F,G WHERE B='ORD-001'")
 *
 * Returns: JSON array of row objects, one key per selected column (c0, c1, ...)
 *   e.g. [{ c0: "https://...", c1: "label" }, ...]
 */
export default async function handler(req, res) {
  const { sheet, tq } = req.query;

  if (!sheet || !tq) {
    return res.status(400).json({ error: 'sheet and tq are required' });
  }

  const spreadsheetId = process.env.GVIZ_SPREADSHEET_ID;
  if (!spreadsheetId) {
    return res.status(500).json({ error: 'GVIZ_SPREADSHEET_ID not configured' });
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
