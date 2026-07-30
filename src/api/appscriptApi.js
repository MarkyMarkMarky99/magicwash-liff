import { cacheKey, fetchAndCache } from './localCache';
import { normalizeInvoiceNumber } from './gvizApi';

export async function getInvoiceByNumberViaAppScript(invoiceNumber, { signal } = {}) {
  const normalized = normalizeInvoiceNumber(invoiceNumber);
  const key = cacheKey('invoiceView', normalized);
  const url = `/api/appscript-invoice?invoiceNumber=${encodeURIComponent(normalized)}`;
  const rows = await fetchAndCache(url, key, (r) => r, { signal });
  return rows[0] ?? null;
}
