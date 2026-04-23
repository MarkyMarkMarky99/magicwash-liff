/**
 * Vercel Serverless Function — Order detail lookup via OrdersView (MagicwashPortal)
 *
 * Query params:
 *   orderId - order ID (e.g. "ORD-001")
 *
 * OrdersView columns (SELECT *):
 * c0=order_id c1=customer_id c2=order_number c3=received_date c4=due_date
 * c5=service_type c6=status c7=quantity c8=note c9=items_json
 * c10=synced_at c11=created_at
 */

const ORDERS_VIEW_SHEET = 'OrdersView';

function gvizDateToISO(v) {
  if (!v) return null;
  const m = String(v).match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (!m) return v;
  return `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
}

function sanitize(val) {
  return String(val ?? '').replace(/'/g, '');
}

function buildGvizUrl(spreadsheetId, sheet, tq) {
  return (
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
    `?sheet=${encodeURIComponent(sheet)}` +
    `&tq=${encodeURIComponent(tq)}` +
    `&tqx=out:json`
  );
}

async function fetchGviz(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GViz responded ${res.status}`);
  const text = await res.text();
  const json = JSON.parse(text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, ''));
  return (json?.table?.rows ?? []).map((row) => {
    const obj = {};
    (row.c ?? []).forEach((cell, i) => { obj[`c${i}`] = cell?.v ?? null; });
    return obj;
  });
}

function mapOrdersView(row) {
  let items = [];
  try { items = JSON.parse(row.c9 ?? '[]'); } catch { items = []; }
  return {
    id:            row.c0,
    customer_id:   row.c1,
    received_date: gvizDateToISO(row.c3),
    due_date:      gvizDateToISO(row.c4),
    service_type:  row.c5,
    status:        row.c6,
    quantity:      row.c7,
    note:          row.c8,
    items,
  };
}

export default async function handler(req, res) {
  const { orderId } = req.query;
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  const spreadsheetId = process.env.GVIZ_PORTAL_SPREADSHEET_ID;
  if (!spreadsheetId) {
    return res.status(500).json({ error: 'Portal spreadsheet ID not configured' });
  }

  const tq = `SELECT * WHERE A='${sanitize(orderId)}' LIMIT 1`;

  let rows;
  try {
    rows = await fetchGviz(buildGvizUrl(spreadsheetId, ORDERS_VIEW_SHEET, tq));
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }

  if (!rows.length) return res.json({ status: 'not_found' });

  return res.json({ status: 'found', data: mapOrdersView(rows[0]) });
}
