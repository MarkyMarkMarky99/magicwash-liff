/**
 * Vercel Serverless Function — Generic GViz proxy
 *
 * Hides spreadsheet IDs server-side. Clients pass source + tq only.
 * source maps to { sheetName, spreadsheetId, columns[] } via SOURCE_MAP.
 * Responses are named-key objects, not positional c0/c1/... keys.
 *
 * Query params:
 *   source - source key (e.g. "customers", "ordersView", "laundryPhotos")
 *   tq     - GViz SQL query  (e.g. "SELECT * WHERE B='CUS-001'")
 *   cols   - optional comma-separated camelCase column names to include
 *            (e.g. "orderId,status,dueDate"). Omit to return all columns.
 *
 * Returns: JSON array of row objects with camelCase field names
 *   e.g. [{ customerId: "CUS-001", customerName: "...", ... }]
 */
import { SOURCE_MAP, fetchGvizMapped } from './_gviz.js';

export default async function handler(req, res) {
  const { source, tq, cols } = req.query;

  if (!source || !tq) {
    return res.status(400).json({ error: 'source and tq are required' });
  }

  if (!(source in SOURCE_MAP)) {
    return res.status(400).json({
      error: `Unknown source "${source}". Known: ${Object.keys(SOURCE_MAP).join(', ')}`,
    });
  }

  let selectCols = null;
  if (cols) {
    const knownCols = new Set(SOURCE_MAP[source].columns);
    selectCols = cols.split(',').map((c) => c.trim()).filter(Boolean);
    const unknown = selectCols.filter((c) => !knownCols.has(c));
    if (unknown.length) {
      return res.status(400).json({
        error: `Unknown columns for "${source}": ${unknown.join(', ')}. Known: ${[...knownCols].join(', ')}`,
      });
    }
  }

  const { rows, error } = await fetchGvizMapped(source, tq);
  if (error) return res.status(502).json({ error });

  const result = selectCols
    ? rows.map((row) => Object.fromEntries(selectCols.map((c) => [c, row[c] ?? null])))
    : rows;

  res.status(200).json(result);
}
