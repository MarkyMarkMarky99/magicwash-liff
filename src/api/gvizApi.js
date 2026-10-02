import { cacheKey, gvizSwrFetch, lsClear, gvizUrl } from './localCache.js';
import { normalizeInvoiceSummary } from './invoiceSummary.js';

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

export function normalizeInvoiceNumber(invoiceNumber) {
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

const INVOICE_SUMMARY_COLS = 'invoiceNumber,status,customerId,issuedDate,dueDate,grandTotal,paidAmount,balanceDue,paymentsJson';

export async function getInvoicesByCustomerId(customerId) {
  const url = gvizUrl({
    source: 'invoiceView', filterField: 'customerId', filterValue: customerId, cols: INVOICE_SUMMARY_COLS,
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid invoice summary response');
  return rows.map(normalizeInvoiceSummary);
}