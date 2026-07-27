/**
 * Vercel Serverless Function — Generic GViz proxy
 *
 * Hides spreadsheet IDs server-side. Clients pass source + optional tq/filter/sort.
 * source maps to { sheetName, spreadsheetId, columns[], headers[] } via SOURCE_MAP.
 * Responses are named-key objects, not positional c0/c1/... keys.
 *
 * Query params:
 *   source      - source key (e.g. "customers", "ordersView", "laundryPhotos") — required
 *   tq          - GViz SQL query (optional; defaults to "SELECT *")
 *   filterField - camelCase field name to equality-filter on (after mapping)
 *   filterValue - value for filterField equality (string-coerced)
 *   sortField   - camelCase field name to sort by (after mapping)
 *   sortDir     - 'asc' | 'desc' (default 'asc')
 *   limit       - max rows to return after filter/sort
 *   cols        - optional comma-separated camelCase column names to include
 *                 (e.g. "orderId,status,dueDate"). Omit to return all columns.
 *
 * Returns: JSON array of row objects with camelCase field names
 *   e.g. [{ customerId: "CUS-001", customerName: "...", ... }]
 */
import { SOURCE_MAP, fetchGvizMapped } from './_gviz.js';

export default async function handler(req, res) {
  const { source, tq, cols, filterField, filterValue, sortField, sortDir, limit } = req.query;

  if (!source) {
    return res.status(400).json({ error: 'source is required' });
  }

  if (!(source in SOURCE_MAP)) {
    return res.status(400).json({
      error: `Unknown source "${source}". Known: ${Object.keys(SOURCE_MAP).join(', ')}`,
    });
  }

  const knownCols = new Set(SOURCE_MAP[source].columns);

  let selectCols = null;
  if (cols) {
    selectCols = cols.split(',').map((c) => c.trim()).filter(Boolean);
    const unknown = selectCols.filter((c) => !knownCols.has(c));
    if (unknown.length) {
      return res.status(400).json({
        error: `Unknown columns for "${source}": ${unknown.join(', ')}. Known: ${[...knownCols].join(', ')}`,
      });
    }
  }

  if (filterField != null && filterField !== '' && !knownCols.has(filterField)) {
    return res.status(400).json({
      error: `Unknown filterField for "${source}": ${filterField}. Known: ${[...knownCols].join(', ')}`,
    });
  }

  if (sortField != null && sortField !== '' && !knownCols.has(sortField)) {
    return res.status(400).json({
      error: `Unknown sortField for "${source}": ${sortField}. Known: ${[...knownCols].join(', ')}`,
    });
  }

  const hasFilterField = typeof filterField === 'string' && filterField !== '';
  if (hasFilterField && filterValue == null) {
    return res.status(400).json({ error: 'filterValue is required when filterField is provided' });
  }
  if (!hasFilterField && filterValue != null) {
    return res.status(400).json({ error: 'filterField is required when filterValue is provided' });
  }

  const query = tq || 'SELECT *';
  const { rows, error } = await fetchGvizMapped(
    source,
    query,
    hasFilterField ? { field: filterField, value: filterValue } : null,
  );
  if (error) return res.status(502).json({ error });

  let result = rows;

  // Equality filter (string-coerced, same looseness as former gvizStr WHERE clauses)
  if (hasFilterField) {
    const want = String(filterValue);
    result = result.filter((row) => String(row[filterField] ?? '') === want);
  }

  // Sort with nulls last
  if (sortField != null && sortField !== '') {
    const desc = String(sortDir ?? 'asc').toLowerCase() === 'desc';
    result = [...result].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const aNull = av == null || av === '';
      const bNull = bv == null || bv === '';
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      const an = Number(av);
      const bn = Number(bv);
      const bothNumeric = Number.isFinite(an) && Number.isFinite(bn)
        && String(av).trim() !== '' && String(bv).trim() !== '';
      const left = bothNumeric ? an : String(av);
      const right = bothNumeric ? bn : String(bv);
      if (left < right) return desc ? 1 : -1;
      if (left > right) return desc ? -1 : 1;
      return 0;
    });
  }

  // Limit
  if (limit != null && limit !== '') {
    const n = Number(limit);
    if (Number.isFinite(n) && n >= 0) {
      result = result.slice(0, n);
    }
  }

  // Column projection last
  if (selectCols) {
    result = result.map((row) => Object.fromEntries(selectCols.map((c) => [c, row[c] ?? null])));
  }

  res.status(200).json(result);
}
