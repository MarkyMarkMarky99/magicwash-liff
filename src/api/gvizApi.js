import { cacheKey, gvizSwrFetch, gvizUrl, lsClear, lsSet } from './localCache';

const INVOICE_VIEW_COLS = 'invoiceNumber,status,billingType,billingPeriodStart,billingPeriodEnd,issuedDate,dueDate,customerId,customerJson,itemsJson,adjustmentsJson,paymentsJson,subtotal,adjustmentTotal,grandTotal,paidAmount,balanceDue';

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
    { filterField: 'orderId', filterValue: orderId },
    orderId,
    transformPhoto,
    onRevalidate ? (rows) => onRevalidate(rows.filter((r) => r.imageUrl)) : null,
    'imageUrl,notes',
  );
  return rows.filter((r) => r.imageUrl);
}

function normalizeInvoiceNumber(invoiceNumber) {
  if (typeof invoiceNumber !== 'string' || !invoiceNumber.trim()) {
    throw new Error('[gvizApi] Invalid invoice number');
  }
  return invoiceNumber.trim();
}

export function invalidateInvoiceCache(invoiceNumber) {
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
  lsClear(cacheKey('invoiceView', normalizedInvoiceNumber));
}

export async function getInvoiceByNumber(invoiceNumber, onRevalidate) {
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
  const rows = await gvizSwrFetch(
    'invoiceView',
    { filterField: 'invoiceNumber', filterValue: normalizedInvoiceNumber, limit: 1 },
    normalizedInvoiceNumber,
    undefined,
    onRevalidate ? (freshRows) => onRevalidate(freshRows[0] ?? null) : null,
    INVOICE_VIEW_COLS,
    'invoiceView',
  );
  return rows[0] ?? null;
}

export async function getInvoiceByNumberFresh(invoiceNumber, { signal } = {}) {
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
  const key = cacheKey('invoiceView', normalizedInvoiceNumber);
  lsClear(key);

  const url = gvizUrl({
    source: 'invoiceView',
    filterField: 'invoiceNumber',
    filterValue: normalizedInvoiceNumber,
    limit: 1,
    cols: INVOICE_VIEW_COLS,
  });
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('[gvizApi] Invalid invoice response');
  if (rows.length) lsSet(key, rows);
  return rows[0] ?? null;
}

export async function syncInvoiceView(invoiceNumber, { signal } = {}) {
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
  const res = await fetch('/api/sync-invoice-view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceNumber: normalizedInvoiceNumber }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const result = await res.json();
  if (result?.ok !== true) throw new Error('[gvizApi] Invoice sync failed');
}
