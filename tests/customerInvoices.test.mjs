import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { normalizeInvoiceSummary, getInvoicePaymentPresentation } from '../src/api/invoiceSummary.js';
import { getCustomerInvoices, invalidateCustomerInvoicesAfterPayment } from '../src/api/customerInvoices.js';
import { cacheKey, lsGet, lsGetStale, lsSet } from '../src/api/localCache.js';

const customerId = 'CUS-SYNTHETIC';
function row(overrides = {}) {
  return {
    invoiceNumber: 'INV261003753632', customerId, status: 'UNPAID',
    grandTotal: 905, paidAmount: 0, balanceDue: 905, paymentsJson: '[]', ...overrides,
  };
}
function summary(overrides = {}) {
  return normalizeInvoiceSummary(row(overrides));
}
function present(overrides = {}) {
  return getInvoicePaymentPresentation(summary(overrides));
}

test('verified full payment has no balance action and retains verified total', () => {
  const invoice = summary({ status: 'PAID', paidAmount: 905, balanceDue: 0 });
  assert.equal(invoice.paidAmount, 905);
  assert.equal(getInvoicePaymentPresentation(invoice).canPay, false);
  assert.equal(getInvoicePaymentPresentation(invoice).remainingDue, 0);
});

test('verified partial payment retains paid amount and asks only for remaining balance', () => {
  const invoice = summary({ status: 'PARTIALLY_PAID', grandTotal: 3740, paidAmount: 1590, balanceDue: 2150 });
  assert.equal(invoice.paidAmount, 1590);
  assert.equal(invoice.status, 'PARTIALLY_PAID');
  assert.deepEqual(getInvoicePaymentPresentation(invoice), {
    remainingDue: 2150, canPay: true, awaitingVerification: false,
  });
});

test('pending full coverage is awaiting verification, never verified paid', () => {
  const invoice = summary({ status: 'OVERDUE', paidAmount: 0, balanceDue: 740,
    paymentsJson: JSON.stringify([{ status: 'PENDING', amount: 49000 }]) });
  assert.equal(invoice.paidAmount, 0);
  assert.equal(invoice.status, 'OVERDUE');
  assert.equal(invoice.pendingAmount, 49000);
  assert.deepEqual(getInvoicePaymentPresentation(invoice), {
    remainingDue: 0, canPay: false, awaitingVerification: true,
  });
});

test('partial pending coverage only reduces the new payment ask', () => {
  const result = present({ grandTotal: 1000, balanceDue: 1000,
    paymentsJson: JSON.stringify([{ status: 'PENDING', amount: '250' }]) });
  assert.deepEqual(result, { remainingDue: 750, canPay: true, awaitingVerification: true });
});

test('mixed verified, pending, failed and refunded receipts preserve signed pending semantics', () => {
  const invoice = summary({ grandTotal: 1000, paidAmount: 400, balanceDue: 600,
    paymentsJson: JSON.stringify([
      { status: 'VERIFIED', amount: 400 }, { status: 'PENDING', amount: 250 },
      { status: 'FAILED', amount: 500 }, { status: 'CANCELLED', amount: 100 },
      { status: 'PENDING', amount: -50 },
    ]) });
  assert.equal(invoice.paidAmount, 400);
  assert.equal(invoice.pendingAmount, 200);
  assert.equal(getInvoicePaymentPresentation(invoice).remainingDue, 400);
});

test('draft/cancelled/void invoices never offer payment even with residual balance', () => {
  for (const status of ['DRAFT', 'CANCELLED', 'VOID']) {
    assert.equal(present({ status }).canPay, false);
    assert.equal(present({ status, paymentsJson: '[{"status":"PENDING","amount":100}]' }).awaitingVerification, false);
  }
});

test('malformed payment documents cannot create pending or verified money', () => {
  for (const paymentsJson of ['{invalid', '{}', 'null', '[null,1,{"status":"PENDING","amount":"invalid"}]']) {
    const invoice = summary({ paidAmount: '1590', paymentsJson });
    assert.equal(invoice.pendingAmount, 0);
    assert.equal(invoice.paidAmount, 1590);
  }
  assert.equal(summary({ paymentsJson: [{ amount: 100 }] }).pendingAmount, 100);
});

test('unknown balances and refreshing/failed rows do not offer payment', () => {
  assert.equal(present({ balanceDue: null }).canPay, false);
  for (const paymentRefreshStatus of ['loading', 'error']) {
    assert.equal(getInvoicePaymentPresentation({ ...summary(), paymentRefreshStatus }).canPay, false);
  }
});

function withNetwork(t, handler) {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.fetch = async (url) => ({
    ok: true, json: async () => handler(new URL(url, 'http://fixture.local')),
  });
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  });
}

test('stale GViz full and partial payments are reconciled from live source and cached', async (t) => {
  const paid = row();
  const partial = row({ invoiceNumber: 'INV261094507500', grandTotal: 3740, balanceDue: 3740 });
  const updates = [];
  withNetwork(t, (url) => {
    if (url.pathname === '/api/gviz') {
      assert.match(url.searchParams.get('cols'), /paidAmount/);
      assert.match(url.searchParams.get('cols'), /paymentsJson/);
      return [paid, partial];
    }
    const id = url.searchParams.get('invoiceNumber');
    return id === paid.invoiceNumber
      ? [{ ...paid, status: 'PAID', paidAmount: 905, balanceDue: 0 }]
      : [{ ...partial, status: 'PARTIALLY_PAID', paidAmount: 1590, balanceDue: 2150 }];
  });
  lsSet(cacheKey('invoiceViewByCustomer', customerId), [summary()]);
  const result = await getCustomerInvoices(customerId, (value) => updates.push(value), { refresh: true });
  assert.deepEqual(updates.find((update) => update.length === 2).map((invoice) => invoice.paymentRefreshStatus), ['loading', 'loading']);
  assert.ok(updates[0].every((invoice) => !getInvoicePaymentPresentation(invoice).canPay));
  assert.equal(result[0].status, 'PAID');
  assert.equal(result[0].paidAmount, 905);
  assert.equal(getInvoicePaymentPresentation(result[0]).canPay, false);
  assert.equal(result[1].paidAmount, 1590);
  assert.equal(result[1].balanceDue, 2150);
  assert.deepEqual(lsGet(cacheKey('invoiceViewByCustomer', customerId)), result);
  assert.equal(cacheKey('invoiceViewByCustomer', customerId), 'mw:invoiceViewByCustomerV3:CUS-SYNTHETIC');
});

test('warm customer list reuse makes no reads; only a recorded payment triggers fresh reconciliation', async (t) => {
  let round = 0;
  withNetwork(t, (url) => {
    if (url.pathname === '/api/gviz') { round++; return [row()]; }
    return round === 1 ? [row()] : [row({ status: 'PAID', paidAmount: 905, balanceDue: 0 })];
  });
  const before = await getCustomerInvoices(customerId);
  assert.equal(before[0].status, 'UNPAID');
  const callbacks = [];
  const warmPromise = getCustomerInvoices(customerId, (value) => callbacks.push(value));
  assert.equal(callbacks.length, 1);
  const warm = await warmPromise;
  assert.equal(round, 1);
  assert.deepEqual(warm, before);
  invalidateCustomerInvoicesAfterPayment(customerId, { tone: 'success' });
  const after = await getCustomerInvoices(customerId);
  assert.equal(round, 2);
  assert.equal(after[0].status, 'PAID');
  assert.equal(getInvoicePaymentPresentation(after[0]).canPay, false);
});

test('live notfound, failures, cross-customer rows and legacy IDs preserve safe fallback', async (t) => {
  const rows = [
    row(), row({ invoiceNumber: 'INV261094507500' }),
    row({ invoiceNumber: 'INV261079743135' }), row({ invoiceNumber: 'INV-LEGACY-0001' }),
  ];
  const liveIds = [];
  withNetwork(t, (url) => {
    if (url.pathname === '/api/gviz') return rows;
    const id = url.searchParams.get('invoiceNumber');
    liveIds.push(id);
    if (id === rows[0].invoiceNumber) return [];
    if (id === rows[1].invoiceNumber) throw new Error('synthetic upstream failure');
    return [row({ invoiceNumber: id, customerId: 'OTHER-CUSTOMER', status: 'PAID', paidAmount: 905, balanceDue: 0 })];
  });
  const result = await getCustomerInvoices(customerId);
  assert.equal(result.length, 4);
  assert.equal(liveIds.length, 3);
  assert.ok(!liveIds.includes('INV-LEGACY-0001'));
  for (const invoice of result.slice(0, 3)) {
    assert.equal(invoice.customerId, customerId);
    assert.equal(invoice.status, 'UNPAID');
    assert.equal(invoice.paymentRefreshStatus, 'error');
    assert.equal(getInvoicePaymentPresentation(invoice).canPay, false);
  }
  assert.equal(result[3].status, 'UNPAID');
});

test('live enrichment is limited to three concurrent outstanding valid invoices', async (t) => {
  const rows = Array.from({ length: 8 }, (_, index) => row({ invoiceNumber: `INV26100000000${index}` }));
  rows.push(row({ invoiceNumber: 'INV261000000098', status: 'PAID', balanceDue: 0, paidAmount: 905 }));
  rows.push(row({ invoiceNumber: 'INV261000000099', status: 'VOID' }));
  let active = 0;
  let maximum = 0;
  let reads = 0;
  withNetwork(t, async (url) => {
    if (url.pathname === '/api/gviz') return rows;
    active++; reads++; maximum = Math.max(maximum, active);
    await setImmediate();
    active--;
    return [rows.find((invoice) => invoice.invoiceNumber === url.searchParams.get('invoiceNumber'))];
  });
  const result = await getCustomerInvoices(customerId);
  assert.equal(reads, 8);
  assert.equal(maximum, 3);
  assert.equal(result.length, 10);
});
test('recorded pending and verified payments expire summaries; failures and duplicates do not', async (t) => {
  withNetwork(t, () => { throw new Error('No reads expected'); });
  const key = cacheKey('invoiceViewByCustomer', customerId);
  for (const tone of ['error', 'duplicate']) {
    lsSet(key, [summary()]);
    assert.equal(invalidateCustomerInvoicesAfterPayment(customerId, { tone }), false);
    assert.equal(lsGetStale(key).isStale, false);
  }
  for (const tone of ['success', 'pending']) {
    lsSet(key, [summary()]);
    assert.equal(invalidateCustomerInvoicesAfterPayment(customerId, { tone }), true);
    assert.equal(lsGetStale(key).isStale, true);
    assert.equal(lsGetStale(key).value[0].invoiceNumber, 'INV261003753632');
  }
});

test('cached live paid value is painted immediately and survives stale GViz plus failed live refresh', async (t) => {
  const paid = { ...summary({ status: 'PAID', paidAmount: 905, balanceDue: 0 }),
    paymentSource: 'live', paymentRefreshStatus: 'done' };
  const updates = [];
  withNetwork(t, (url) => url.pathname === '/api/gviz' ? [row()] : []);
  lsSet(cacheKey('invoiceViewByCustomer', customerId), [paid], -1);
  const promise = getCustomerInvoices(customerId, (value) => updates.push(value));
  assert.equal(updates[0][0].paidAmount, 905);
  assert.equal(updates[0][0].status, 'PAID');
  const result = await promise;
  assert.ok(updates.every((update) => update[0].paidAmount === 905));
  assert.equal(result[0].status, 'PAID');
  assert.equal(result[0].paidAmount, 905);
  assert.equal(result[0].paymentRefreshStatus, 'error');
  assert.equal(getInvoicePaymentPresentation(result[0]).canPay, false);
});

test('cached verified partial amounts survive background refresh while payment actions are suspended', async (t) => {
  const partial = { ...summary({ status: 'PARTIALLY_PAID', grandTotal: 3740, paidAmount: 1590, balanceDue: 2150 }),
    paymentSource: 'live', paymentRefreshStatus: 'done' };
  const updates = [];
  withNetwork(t, (url) => url.pathname === '/api/gviz'
    ? [row({ grandTotal: 3740, balanceDue: 3740 })] : []);
  lsSet(cacheKey('invoiceViewByCustomer', customerId), [partial], -1);
  const result = await getCustomerInvoices(customerId, (value) => updates.push(value));
  assert.ok(updates.every((update) => update[0].paidAmount === 1590));
  assert.equal(updates[0][0].paymentRefreshStatus, 'loading');
  assert.equal(getInvoicePaymentPresentation(updates[0][0]).canPay, false);
  assert.equal(result[0].balanceDue, 2150);
  assert.equal(result[0].paymentRefreshStatus, 'error');
});

test('provisional GViz never replaces cached paid summaries during a paused live refresh', async (t) => {
  let release;
  let announceLive;
  const liveStarted = new Promise((resolve) => { announceLive = resolve; });
  const liveResponse = new Promise((resolve) => { release = resolve; });
  let reads = 0;
  const paid = { ...summary({ status: 'PAID', paidAmount: 905, balanceDue: 0 }),
    paymentSource: 'live', paymentRefreshStatus: 'done' };
  withNetwork(t, async (url) => {
    reads++;
    if (url.pathname === '/api/gviz') return [row()];
    announceLive();
    await liveResponse;
    return [row({ status: 'PAID', paidAmount: 905, balanceDue: 0 })];
  });
  lsSet(cacheKey('invoiceViewByCustomer', customerId), [paid]);
  const refreshing = getCustomerInvoices(customerId, undefined, { refresh: true });
  await liveStarted;
  const duringRefresh = await getCustomerInvoices(customerId);
  assert.equal(duringRefresh[0].status, 'PAID');
  assert.equal(duringRefresh[0].paidAmount, 905);
  assert.equal(reads, 2);
  release();
  await refreshing;
});

test('a superseded refresh cannot overwrite the latest reconciled customer cache', async (t) => {
  let releaseFirst;
  let announceFirst;
  const firstStarted = new Promise((resolve) => { announceFirst = resolve; });
  const firstResponse = new Promise((resolve) => { releaseFirst = resolve; });
  let liveReads = 0;
  withNetwork(t, async (url) => {
    if (url.pathname === '/api/gviz') return [row()];
    liveReads++;
    if (liveReads === 1) {
      announceFirst();
      await firstResponse;
      return [row()];
    }
    return [row({ status: 'PAID', paidAmount: 905, balanceDue: 0 })];
  });
  const older = getCustomerInvoices(customerId, undefined, { refresh: true });
  await firstStarted;
  await getCustomerInvoices(customerId, undefined, { refresh: true });
  releaseFirst();
  await older;
  assert.equal(lsGet(cacheKey('invoiceViewByCustomer', customerId))[0].status, 'PAID');
  assert.equal(lsGet(cacheKey('invoiceViewByCustomer', customerId))[0].paidAmount, 905);
});
test('summary preserves issued/due dates and safely marks omitted dates absent', () => {
  const invoice = summary({ issuedDate: '2026-10-03', dueDate: '2026-10-17' });
  assert.equal(invoice.issuedDate, '2026-10-03');
  assert.equal(invoice.dueDate, '2026-10-17');
  for (const missing of [undefined, null, '', {}]) {
    const absent = summary({ issuedDate: missing, dueDate: missing });
    assert.equal(absent.issuedDate, null);
    assert.equal(absent.dueDate, null);
  }
});

test('issued/due dates are requested from summaries and updated from live source', async (t) => {
  const updates = [];
  withNetwork(t, (url) => {
    if (url.pathname === '/api/gviz') {
      assert.match(url.searchParams.get('cols'), /issuedDate/);
      assert.match(url.searchParams.get('cols'), /dueDate/);
      return [row({ issuedDate: '2026-10-03', dueDate: '2026-10-17' })];
    }
    return [row({ status: 'PAID', paidAmount: 905, balanceDue: 0,
      issuedDate: '2026-10-04', dueDate: '2026-10-18' })];
  });
  const result = await getCustomerInvoices(customerId, (value) => updates.push(value));
  assert.equal(updates[0][0].issuedDate, '2026-10-03');
  assert.equal(updates[0][0].dueDate, '2026-10-17');
  assert.equal(result[0].issuedDate, '2026-10-04');
  assert.equal(result[0].dueDate, '2026-10-18');
  assert.equal(lsGet(cacheKey('invoiceViewByCustomer', customerId))[0].dueDate, '2026-10-18');
});

test('date-aware schema ignores warm V2 entries lacking dates', async (t) => {
  let reads = 0;
  withNetwork(t, (url) => {
    reads++;
    return [row({ issuedDate: '2026-10-03', dueDate: '2026-10-17',
      ...(url.pathname === '/api/gviz' ? {} : { status: 'PAID', paidAmount: 905, balanceDue: 0 }) })];
  });
  lsSet('mw:invoiceViewByCustomerV2:CUS-SYNTHETIC', [summary()]);
  const result = await getCustomerInvoices(customerId);
  assert.equal(reads, 2);
  assert.equal(result[0].issuedDate, '2026-10-03');
  assert.equal(result[0].dueDate, '2026-10-17');
});