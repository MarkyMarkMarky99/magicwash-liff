import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaymentRecorder,
  validatePaymentRow,
  paymentRowToCustomerPayment,
  customerPaymentToSheetFields,
} from '../server/recordPayment.js';

const paymentId = 'pay_12345678-1234-4234-8234-123456789abc';
const createdAt = '2026-07-28T07:00:00.000Z';
const gatewayUrl = 'https://example.com/exec';
const verificationResponse = { success: true, data: { transRef: '001234' } };

function input(overrides = {}) {
  return {
    paymentId,
    invoice: { invoiceNumber: 'INV-001', balanceDue: 100, currency: 'THB' },
    authority: {
      source: 'trusted_server',
      acceptedSlipAmountCurrency: 'THB',
      slipOkAmountCheckUsed: false,
      slipOkReceiverCheckUsed: false,
      slipOkDuplicateCheckUsed: false,
    },
    amount: 100,
    paidAt: '2026-07-28T06:43:12.000Z',
    reference: '001234',
    status: 'VERIFIED',
    notes: '=untrusted note',
    verification: { httpStatus: 200, response: verificationResponse },
    method: 'BANK_TRANSFER',
    proofUrl: 'https://example.com/slip.jpg',
    ...overrides,
  };
}

async function record(candidate) {
  const calls = [];
  const setup = createPaymentRecorder({
    gatewayUrl,
    createdBy: 'liff-verify-slip',
    now: () => new Date(createdAt),
    fetch: async (url, options) => {
      const request = JSON.parse(options.body);
      calls.push({ url, options, request });
      return {
        status: 200,
        text: async () => JSON.stringify({
          resource: 'sheet', status: 'ok', target: 'Payment',
          data: request.data, write: { updated_range: 'Payment!A2:P2' },
        }),
      };
    },
  });
  assert.equal(setup.kind, 'ready');
  const result = await setup.recorder.record(candidate);
  return { result, calls };
}

test('APPEND changes only paid_at to unprotected Bangkok wall time', async () => {
  const { result, calls } = await record(input());
  assert.deepEqual(result, { kind: 'success', writeOutcome: 'confirmed' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, gatewayUrl);
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(calls[0].options.headers, { 'Content-Type': 'text/plain;charset=utf-8' });
  assert.deepEqual(calls[0].request, {
    resource: 'sheet', action: 'APPEND', target: 'Payment',
    data: {
      payment_id: `'${paymentId}`,
      invoice_number: "'INV-001",
      amount: 100,
      method: 'BANK_TRANSFER',
      status: 'VERIFIED',
      paid_at: '2026-07-28 13:43:12',
      reference: "'001234",
      proof_url: "'https://example.com/slip.jpg",
      slip_data: `'${JSON.stringify(verificationResponse)}`,
      notes: "'=untrusted note",
      created_at: `'${createdAt}`,
      created_by: "'liff-verify-slip",
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    },
  });
});

for (const [paidAt, expected] of [
  ['2026-07-28T13:43:12+07:00', '2026-07-28 13:43:12'],
  ['2026-07-28T02:43:12-04:00', '2026-07-28 13:43:12'],
  ['2026-12-31T17:00:00.999Z', '2027-01-01 00:00:00'],
  ['2024-02-29T17:30:00Z', '2024-03-01 00:30:00'],
  [null, null],
]) {
  test(`paid_at wire conversion: ${paidAt}`, async () => {
    const { result, calls } = await record(input({ paidAt }));
    assert.equal(result.kind, 'success');
    assert.equal(calls[0].request.data.paid_at, expected);
  });
}

test('pending payment keeps nullable fields and omits unknown amount', async () => {
  const { result, calls } = await record(input({
    amount: null, paidAt: null, reference: null, proofUrl: null, status: 'PENDING',
  }));
  assert.equal(result.kind, 'success');
  const row = calls[0].request.data;
  assert.equal(Object.hasOwn(row, 'amount'), false);
  for (const field of ['paid_at', 'reference', 'proof_url']) {
    assert.equal(row[field], null);
  }
});

for (const paidAt of ['2026-07-28 13:43:12', '2026-02-30T06:43:12Z', '=NOW()']) {
  test(`invalid/non-ISO paidAt rejected before dispatch: ${paidAt}`, async () => {
    const { result, calls } = await record(input({ paidAt }));
    assert.equal(result.kind, 'validation_error');
    assert.ok(result.issues.some((issue) => issue.path === 'paidAt'));
    assert.equal(calls.length, 0);
  });
}

test('internal row validation and customer mapping still use ISO paid_at', () => {
  const row = {
    payment_id: paymentId, invoice_number: 'INV-001', amount: 100,
    method: 'BANK_TRANSFER', status: 'VERIFIED', paid_at: input().paidAt,
    reference: '001234', proof_url: input().proofUrl,
    slip_data: JSON.stringify(verificationResponse), notes: null,
    created_at: createdAt, created_by: 'liff-verify-slip',
    updated_at: null, updated_by: null, deleted_at: null, deleted_by: null,
  };
  const validation = validatePaymentRow(row);
  assert.equal(validation.kind, 'valid');
  assert.equal(validation.row.paid_at, input().paidAt);
  const customerPayment = paymentRowToCustomerPayment(validation.row);
  assert.equal(customerPayment.paidAt, input().paidAt);
  assert.equal(customerPaymentToSheetFields(customerPayment).paid_at, input().paidAt);
  assert.equal(validatePaymentRow({ ...row, paid_at: '2026-07-28 13:43:12' }).kind, 'invalid');
});
