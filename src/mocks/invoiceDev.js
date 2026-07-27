const DEV_INVOICE_NUMBER = 'INV-DEV-0001';
const SAFE_INVOICE_NUMBER_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,39}$/;

const devInvoiceCustomer = {
  customerCode: 'DEMO-0001',
  customerName: 'Demo Customer',
};

const devInvoiceViewRow = {
  invoiceNumber: DEV_INVOICE_NUMBER,
  status: 'UNPAID',
  billingType: 'ORDER',
  billingPeriodStart: null,
  billingPeriodEnd: null,
  issuedDate: '2026-07-20',
  dueDate: '2026-07-30',
  customerJson: JSON.stringify(devInvoiceCustomer),
  itemsJson: JSON.stringify([
    {
      serviceType: 'Laundry',
      description: 'Shirts',
      quantity: 4,
      unit: 'pcs',
      unitPrice: 105,
      subtotal: 420,
      adjustments: [],
      netTotal: 420,
    },
  ]),
  adjustmentsJson: JSON.stringify([
    { label: 'Demo discount', amount: -20 },
  ]),
  paymentsJson: JSON.stringify([]),
  subtotal: 420,
  adjustmentTotal: -20,
  grandTotal: 400,
  paidAmount: 0,
  balanceDue: 400,
};

export function getDevInvoiceViewRow(invoiceNumber) {
  const requested = typeof invoiceNumber === 'string' ? invoiceNumber.trim() : '';
  return {
    ...devInvoiceViewRow,
    invoiceNumber: SAFE_INVOICE_NUMBER_RE.test(requested) ? requested : DEV_INVOICE_NUMBER,
  };
}
