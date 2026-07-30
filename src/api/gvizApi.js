import { cacheKey, gvizSwrFetch, lsClear } from './localCache';
import { toNumber } from './numberUtils';

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

const INVOICE_SUMMARY_COLS = 'invoiceNumber,status,customerId,grandTotal,balanceDue';

function transformInvoiceSummary(row) {
  return {
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    customerId: row.customerId,
    grandTotal: toNumber(row.grandTotal),
    balanceDue: toNumber(row.balanceDue),
  };
}

export async function getInvoicesByCustomerId(customerId, onRevalidate) {
  return gvizSwrFetch(
    'invoiceView',
    { filterField: 'customerId', filterValue: customerId },
    customerId,
    transformInvoiceSummary,
    onRevalidate ? (rows) => onRevalidate(rows) : null,
    INVOICE_SUMMARY_COLS,
    'invoiceViewByCustomer',
  );
}
