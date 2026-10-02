import { getInvoicesByCustomerId } from './gvizApi.js';
import { getInvoiceByNumberViaAppScript } from './appscriptApi.js';
import { normalizeInvoiceSummary } from './invoiceSummary.js';
import { cacheKey, lsGetStale, lsSet } from './localCache.js';

const latestRefresh = new Map();

function needsLiveRead(invoice) {
  return /^INV\d{12}$/.test(invoice.invoiceNumber)
    && !['DRAFT', 'CANCELLED', 'VOID'].includes(invoice.status)
    && (invoice.balanceDue == null || invoice.balanceDue > 0);
}

/** Expire retained summaries only after a newly recorded payment. */
export function invalidateCustomerInvoicesAfterPayment(customerId, outcome) {
  if (!['success', 'pending'].includes(outcome.tone)) return false;
  const key = cacheKey('invoiceViewByCustomer', customerId);
  const { value } = lsGetStale(key);
  if (value) lsSet(key, value, -1);
  return true;
}

/**
 * Warm reconciled summaries need no network read. On cold/expired/manual reads,
 * reconcile outstanding rows with InvoicePreview's live source, three at a time.
 */
export async function getCustomerInvoices(customerId, onUpdate, { refresh = false } = {}) {
  const key = cacheKey('invoiceViewByCustomer', customerId);
  const cached = lsGetStale(key);
  const cachedRows = Array.isArray(cached.value)
    ? cached.value.filter((invoice) => invoice && invoice.customerId === customerId) : null;
  if (cachedRows && !cached.isStale && !refresh) {
    onUpdate?.(cachedRows);
    return cachedRows;
  }
  if (cachedRows) {
    onUpdate?.(cachedRows.map((invoice) => needsLiveRead(invoice)
      ? { ...invoice, paymentRefreshStatus: 'loading' } : invoice));
  }

  const refreshId = (latestRefresh.get(customerId) ?? 0) + 1;
  latestRefresh.set(customerId, refreshId);
  const invoices = await getInvoicesByCustomerId(customerId);
  const cachedByNumber = new Map((cachedRows ?? []).map((invoice) => [invoice.invoiceNumber, invoice]));
  const merged = invoices.map((invoice) => {
    const previous = cachedByNumber.get(invoice.invoiceNumber);
    if (!needsLiveRead(invoice)) return invoice;
    return {
      ...(previous?.paymentSource === 'live' ? previous : invoice),
      paymentRefreshStatus: 'loading',
    };
  });
  const candidates = invoices
    .map((invoice, index) => ({ invoice, index }))
    .filter(({ invoice }) => needsLiveRead(invoice));
  onUpdate?.([...merged]);
  let nextIndex = 0;

  async function reconcile() {
    while (nextIndex < candidates.length) {
      const { invoice, index } = candidates[nextIndex++];
      try {
        const row = await getInvoiceByNumberViaAppScript(invoice.invoiceNumber);
        if (row && row.invoiceNumber === invoice.invoiceNumber && row.customerId === customerId) {
          merged[index] = { ...normalizeInvoiceSummary(row), paymentSource: 'live', paymentRefreshStatus: 'done' };
        } else {
          merged[index] = { ...merged[index], paymentRefreshStatus: 'error' };
        }
      } catch {
        merged[index] = { ...merged[index], paymentRefreshStatus: 'error' };
      }
      onUpdate?.([...merged]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(3, candidates.length) }, reconcile));
  if (latestRefresh.get(customerId) === refreshId) lsSet(key, merged);
  return merged;
}