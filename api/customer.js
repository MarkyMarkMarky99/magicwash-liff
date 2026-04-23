/**
 * Vercel Serverless Function — Customer lookup via GViz
 *
 * Replaces the AppScript GET endpoint for read-only customer queries.
 * Returns the same { status, data } shape that customerApi.js expects.
 *
 * Query params (one required):
 *   customerId  - customer UUID (looks up by CustomerID column)
 *   lineUserId  - LINE user ID  (looks up by Line column)
 */

const CUSTOMERS_SHEET = 'Customers';
const ORDERS_SHEET    = 'OrderForm';

// GViz returns dates as "Date(year,month0,day)" — convert to ISO YYYY-MM-DD
function gvizDateToISO(v) {
  if (!v) return null;
  const m = String(v).match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (!m) return v;
  const year  = m[1];
  const month = String(Number(m[2]) + 1).padStart(2, '0');
  const day   = String(Number(m[3])).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Strip single quotes to prevent GViz query injection
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

// Customers sheet columns (SELECT *):
// c0=Timestamp c1=CustomerID c2=CustomerIndex c3=CustomerName c4=Phone
// c5=Address c6=Location c7=RegisteredDate c8=Facebook c9=Line
// c10=Whatsapp c11=Email c12=CustomerType c13=Source c14=ScheduledDays
// c15=LastVisitDate c16=PreferredContactMethod c17=UpdatedAt c18=UpdatedBy c19=DeletedAt
function mapCustomer(row) {
  return {
    customerId:              row.c1,
    customerIndex:           row.c2,
    customerName:            row.c3,
    phone:                   row.c4,
    address:                 row.c5,
    location:                row.c6,
    registeredDate:          gvizDateToISO(row.c7),
    facebook:                row.c8,
    lineId:                  row.c9,
    whatsapp:                row.c10,
    email:                   row.c11,
    customerType:            row.c12,
    source:                  row.c13,
    scheduledDays:           row.c14,
    lastVisitDate:           gvizDateToISO(row.c15),
    preferredContactMethod:  row.c16,
  };
}

// OrderForm sheet columns (SELECT *):
// c0=id c1=order_number c2=customer_id c3=received_date c4=due_date
// c5=service_type c6=status c7=quantity c8=hangers c9=bags
// c10=hangers_image c11=bags_image c12=form_image c13=note c14=timestamp ...
function mapOrder(row) {
  return {
    orderId:      row.c0,
    orderNumber:  row.c1,
    date:         gvizDateToISO(row.c3),   // received_date → date (matches AppScript field)
    dueDate:      gvizDateToISO(row.c4),
    serviceType:  row.c5,                  // camelCase — matches OrderCard.jsx
    status:       row.c6,
    quantity:     row.c7,
    notes:        row.c13,
  };
}

export default async function handler(req, res) {
  if (req.method === 'POST') return handleLogin(req, res);
  return handleGet(req, res);
}

async function handleLogin(req, res) {
  const { identifier, password } = req.body ?? {};
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier and password are required' });
  }

  const customersSpreadsheetId = process.env.GVIZ_CUSTOMERS_SPREADSHEET_ID;
  const ordersSpreadsheetId    = process.env.GVIZ_SPREADSHEET_ID;
  if (!customersSpreadsheetId || !ordersSpreadsheetId) {
    return res.status(500).json({ error: 'Spreadsheet IDs not configured' });
  }

  const isEmail   = identifier.includes('@');
  const lookupCol = isEmail ? 'L' : 'E';
  const lookupVal = sanitize(identifier);
  const customerTq = `SELECT * WHERE ${lookupCol}='${lookupVal}' AND T IS NULL LIMIT 1`;

  let customerRows;
  try {
    customerRows = await fetchGviz(buildGvizUrl(customersSpreadsheetId, CUSTOMERS_SHEET, customerTq));
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }

  if (!customerRows.length) return res.json({ status: 'not_found' });

  const customer = mapCustomer(customerRows[0]);
  const expected = `${customer.customerIndex ?? ''}${(customer.phone ?? '').slice(-4)}`.toUpperCase();
  if (password.trim().toUpperCase() !== expected) {
    return res.json({ status: 'invalid_password' });
  }

  const ordersTq = `SELECT * WHERE C='${sanitize(customer.customerId)}' ORDER BY D DESC`;
  let orderRows;
  try {
    orderRows = await fetchGviz(buildGvizUrl(ordersSpreadsheetId, ORDERS_SHEET, ordersTq));
  } catch {
    orderRows = [];
  }

  return res.json({ status: 'success', data: { ...customer, orders: orderRows.map(mapOrder) } });
}

async function handleGet(req, res) {
  const { customerId, lineUserId, phone, email } = req.query;

  if (!customerId && !lineUserId && !phone && !email) {
    return res.status(400).json({ error: 'customerId, lineUserId, phone, or email is required' });
  }

  const customersSpreadsheetId = process.env.GVIZ_CUSTOMERS_SPREADSHEET_ID;
  const ordersSpreadsheetId    = process.env.GVIZ_SPREADSHEET_ID;

  if (!customersSpreadsheetId || !ordersSpreadsheetId) {
    return res.status(500).json({ error: 'Spreadsheet IDs not configured' });
  }

  // Columns: B=CustomerID, E=Phone, J=Line, L=Email
  let lookupCol, lookupVal;
  if (customerId)      { lookupCol = 'B'; lookupVal = sanitize(customerId); }
  else if (lineUserId) { lookupCol = 'J'; lookupVal = sanitize(lineUserId); }
  else if (phone)      { lookupCol = 'E'; lookupVal = sanitize(phone); }
  else                 { lookupCol = 'L'; lookupVal = sanitize(email); }

  const customerTq = `SELECT * WHERE ${lookupCol}='${lookupVal}' AND T IS NULL LIMIT 1`;

  let customerRows;
  try {
    customerRows = await fetchGviz(buildGvizUrl(customersSpreadsheetId, CUSTOMERS_SHEET, customerTq));
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }

  if (!customerRows.length) return res.json({ status: 'not_found' });

  const customer = mapCustomer(customerRows[0]);

  const ordersTq = `SELECT * WHERE C='${sanitize(customer.customerId)}' ORDER BY D DESC`;
  let orderRows;
  try {
    orderRows = await fetchGviz(buildGvizUrl(ordersSpreadsheetId, ORDERS_SHEET, ordersTq));
  } catch {
    orderRows = [];
  }

  return res.json({ status: 'found', data: { ...customer, orders: orderRows.map(mapOrder) } });
}
