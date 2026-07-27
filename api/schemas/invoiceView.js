// Schema for the customer-facing InvoiceView materialized view.
// Nested documents are stored as JSON strings in Google Sheets.

export const columns = [
  'invoiceNumber',
  'status',
  'billingType',
  'billingPeriodStart',
  'billingPeriodEnd',
  'issuedDate',
  'dueDate',
  'customerId',
  'customerJson',
  'itemsJson',
  'adjustmentsJson',
  'paymentsJson',
  'subtotal',
  'adjustmentTotal',
  'grandTotal',
  'paidAmount',
  'balanceDue',
];

export const headers = [
  'invoice_number',
  'status',
  'billing_type',
  'billing_period_start',
  'billing_period_end',
  'issued_date',
  'due_date',
  'customer_id',
  'customer_json',
  'items_json',
  'adjustments_json',
  'payments_json',
  'subtotal',
  'adjustment_total',
  'grand_total',
  'paid_amount',
  'balance_due',
];

export const dateColumns = new Set([
  'billingPeriodStart',
  'billingPeriodEnd',
  'issuedDate',
  'dueDate',
]);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'InvoiceView',
  description: 'Customer-facing invoice data, preprocessed from Invoices, InvoiceItems, and Payments.',
  type: 'object',
  required: columns,
  additionalProperties: false,
  properties: {
    invoiceNumber: {
      type: 'string',
      description: 'Customer-facing invoice number.',
    },
    status: {
      type: 'string',
      enum: ['DRAFT', 'UNPAID', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'VOID'],
      description: 'Display status derived from invoice lifecycle, due date, totals, and verified payments.',
    },
    billingType: {
      type: 'string',
      enum: ['ORDER', 'CYCLE'],
      description: 'ORDER is one order per invoice. CYCLE combines orders within a billing period.',
    },
    billingPeriodStart: {
      type: ['string', 'null'],
      format: 'date',
      description: 'Start date of a CYCLE billing period, otherwise null.',
    },
    billingPeriodEnd: {
      type: ['string', 'null'],
      format: 'date',
      description: 'End date of a CYCLE billing period, otherwise null.',
    },
    issuedDate: {
      type: 'string',
      format: 'date',
    },
    dueDate: {
      type: 'string',
      format: 'date',
    },
    customerId: {
      type: 'string',
      description: 'Customer identifier for this invoice — same value as customer.customerCode inside customerJson (customerCode is the actual customer id, not a separate display code). Promoted to a top-level column so invoices can be queried by customer (e.g. filterField=customerId), since GViz cannot filter on a value nested inside a JSON string cell.',
    },
    customerJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: { $ref: '#/$defs/customer' },
    },
    itemsJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/item' },
      },
    },
    adjustmentsJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/adjustment' },
      },
      description: 'Resolved invoice-level adjustments. Item-level adjustments remain with their item.',
    },
    paymentsJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/payment' },
      },
    },
    subtotal: {
      type: 'number',
      description: 'Sum of item subtotals before item-level and invoice-level adjustments.',
    },
    adjustmentTotal: {
      type: 'number',
      description: 'Sum of resolved item-level and invoice-level adjustment amounts.',
    },
    grandTotal: {
      type: 'number',
      description: 'Invoice total after all adjustments.',
    },
    paidAmount: {
      type: 'number',
      description: 'Sum of signed VERIFIED payment amounts. Refunds reduce this value.',
    },
    balanceDue: {
      type: 'number',
      description: 'Amount still due after verified payments, or zero for cancelled and void invoices.',
    },
  },
  allOf: [
    {
      if: {
        properties: {
          billingType: { const: 'CYCLE' },
        },
        required: ['billingType'],
      },
      then: {
        properties: {
          billingPeriodStart: { type: 'string' },
          billingPeriodEnd: { type: 'string' },
        },
      },
      else: {
        properties: {
          billingPeriodStart: { type: 'null' },
          billingPeriodEnd: { type: 'null' },
        },
      },
    },
  ],
  $defs: {
    customer: {
      type: 'object',
      required: ['customerCode', 'customerName'],
      additionalProperties: false,
      properties: {
        customerCode: {
          type: 'string',
          minLength: 1,
        },
        customerName: {
          type: 'string',
          minLength: 1,
        },
        taxId: {
          type: ['string', 'null'],
          pattern: '^[0-9]{13}$',
        },
        branchCode: {
          type: ['string', 'null'],
          pattern: '^[0-9]{5}$',
        },
        contactName: {
          type: ['string', 'null'],
        },
        phone: {
          type: ['string', 'null'],
        },
        email: {
          type: ['string', 'null'],
          format: 'email',
        },
        address: {
          type: ['string', 'null'],
        },
      },
      dependentRequired: {
        branchCode: ['taxId'],
      },
    },
    adjustment: {
      type: 'object',
      required: ['label', 'amount'],
      additionalProperties: false,
      properties: {
        label: {
          type: 'string',
          minLength: 1,
        },
        amount: {
          type: 'number',
          not: { const: 0 },
          description: 'Resolved signed amount ready for display.',
        },
      },
    },
    item: {
      type: 'object',
      required: [
        'description',
        'quantity',
        'unitPrice',
        'subtotal',
        'adjustments',
        'netTotal',
      ],
      additionalProperties: false,
      properties: {
        serviceType: {
          type: ['string', 'null'],
        },
        description: {
          type: 'string',
        },
        quantity: {
          type: 'number',
          exclusiveMinimum: 0,
        },
        unit: {
          type: ['string', 'null'],
        },
        unitPrice: {
          type: 'number',
        },
        subtotal: {
          type: 'number',
        },
        adjustments: {
          type: 'array',
          items: { $ref: '#/$defs/adjustment' },
        },
        netTotal: {
          type: 'number',
        },
      },
    },
    payment: {
      type: 'object',
      required: ['amount', 'method', 'status'],
      additionalProperties: false,
      properties: {
        amount: {
          type: 'number',
          not: { const: 0 },
          description: 'Positive for money received and negative for a refund or reversal.',
        },
        method: {
          type: 'string',
          enum: [
            'CASH',
            'BANK_TRANSFER',
            'CREDIT_CARD',
            'QR_PROMPTPAY',
            'GIFT_VOUCHER',
            'OTHER',
          ],
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'VERIFIED', 'FAILED', 'CANCELLED'],
        },
        paidAt: {
          type: ['string', 'null'],
          format: 'date-time',
        },
        proofUrl: {
          type: ['string', 'null'],
          format: 'uri',
        },
      },
    },
  },
};
