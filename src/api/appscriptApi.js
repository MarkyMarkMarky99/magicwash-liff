import { cacheKey, fetchAndCache } from './localCache.js';
import { normalizeInvoiceNumber } from './gvizApi.js';

export async function getInvoiceByNumberViaAppScript(invoiceNumber, { signal } = {}) {
  const normalized = normalizeInvoiceNumber(invoiceNumber);
  const key = cacheKey('invoiceView', normalized);
  const url = `/api/appscript-invoice?invoiceNumber=${encodeURIComponent(normalized)}`;
  const rows = await fetchAndCache(url, key, (r) => r, { signal });
  return rows[0] ?? null;
}
