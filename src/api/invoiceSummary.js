import { toNumber } from './numberUtils.js';

/** Normalize the sheet's payment document at the invoice summary boundary. */
export function normalizeInvoiceSummary(row) {
  let payments = row.paymentsJson;
  if (typeof payments === 'string') {
    try { payments = JSON.parse(payments); } catch { payments = []; }
  }
  const pendingAmount = (Array.isArray(payments) ? payments : [])
    .filter((payment) => payment && typeof payment === 'object')
    .reduce((sum, payment) => {
      const status = typeof payment.status === 'string' && payment.status.trim()
        ? payment.status.trim() : 'PENDING';
      const amount = toNumber(payment.amount);
      return sum + (status === 'PENDING' ? (amount ?? 0) : 0);
    }, 0);

  return {
    invoiceNumber: row.invoiceNumber,
    status: typeof row.status === 'string' && row.status.trim() ? row.status.trim() : 'DRAFT',
    customerId: row.customerId,
    issuedDate: typeof row.issuedDate === 'string' && row.issuedDate.trim() ? row.issuedDate.trim() : null,
    dueDate: typeof row.dueDate === 'string' && row.dueDate.trim() ? row.dueDate.trim() : null,
    grandTotal: toNumber(row.grandTotal),
    paidAmount: toNumber(row.paidAmount),
    balanceDue: toNumber(row.balanceDue),
    pendingAmount,
  };
}

/** Pending receipts are separate from verified paidAmount and reduce the ask. */
export function getInvoicePaymentPresentation(invoice) {
  const remainingDue = invoice.balanceDue == null
    ? null : Math.max(0, invoice.balanceDue - invoice.pendingAmount);
  const collectable = !['DRAFT', 'CANCELLED', 'VOID'].includes(invoice.status);
  return {
    remainingDue,
    canPay: collectable && remainingDue > 0 && !['loading', 'error'].includes(invoice.paymentRefreshStatus),
    awaitingVerification: collectable && invoice.balanceDue > 0 && invoice.pendingAmount > 0,
  };
}