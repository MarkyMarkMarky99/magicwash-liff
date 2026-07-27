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

// Verified against the live InvoicesView header row: the portal sheet uses
// camelCase headers, unlike the snake_case source tables in the Invoices
// spreadsheet.
export const headers = [
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

// Only the columns the sheet actually stores as date cells. billingPeriodStart
// and billingPeriodEnd are plain ISO strings written by the view builder, so
// they need no GViz date conversion.
export const dateColumns = new Set([
  'issuedDate',
  'dueDate',
]);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'InvoiceView',
  description: 'Customer-facing invoice data, preprocessed from Invoices, InvoiceItems, and Payments.',
  type: 'object',
  // Only fields needed to identify and summarize an invoice are required
  // headers. Nested payloads and secondary totals remain nullable so a
  // harmless sheet-column addition/removal does not take the whole view down.
  required: ['invoiceNumber', 'status', 'customerId', 'grandTotal', 'balanceDue'],
  additionalProperties: false,
  properties: {
    invoiceNumber: {
      type: 'string',
      description: 'Customer-facing invoice number.',
    },
    status: {
      type: 'string',
      enum: ['UNPAID', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'VOID'],
      description:
        'Display status derived from invoice lifecycle, due date, totals, and verified payments. ' +
        'Invoices.status ISSUED expands here into UNPAID, PARTIALLY_PAID, PAID, or OVERDUE; ' +
        'CANCELLED and VOID pass through unchanged. DRAFT invoices are never emitted into this view.',
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
      type: ['string', 'null'],
      format: 'date',
    },
    dueDate: {
      type: ['string', 'null'],
      format: 'date',
    },
    customerId: {
      type: 'string',
      description: 'Customer identifier for this invoice — same value as customer.customerCode inside customerJson (customerCode is the actual customer id, not a separate display code). Promoted to a top-level column so invoices can be queried by customer (e.g. filterField=customerId), since GViz cannot filter on a value nested inside a JSON string cell.',
    },
    customerJson: {
      type: ['string', 'null'],
      contentMediaType: 'application/json',
      contentSchema: { $ref: '#/$defs/customer' },
    },
    itemsJson: {
      type: ['string', 'null'],
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/item' },
      },
    },
    adjustmentsJson: {
      type: ['string', 'null'],
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/adjustment' },
      },
      description: 'Resolved invoice-level adjustments. Item-level adjustments remain with their item.',
    },
    paymentsJson: {
      type: ['string', 'null'],
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/payment' },
      },
    },
    subtotal: {
      type: ['number', 'null'],
      description: 'Sum of item subtotals before item-level and invoice-level adjustments.',
    },
    adjustmentTotal: {
      type: ['number', 'null'],
      description: 'Sum of resolved item-level and invoice-level adjustment amounts.',
    },
    grandTotal: {
      type: 'number',
      description: 'Invoice total after all adjustments.',
    },
    paidAmount: {
      type: ['number', 'null'],
      description: 'Sum of signed VERIFIED payment amounts. Refunds reduce this value.',
    },
    balanceDue: {
      type: 'number',
      description: 'Amount still due after verified payments, or zero for cancelled and void invoices.',
    },
  },
  allOf: [
    {
      // Periods are only pinned to null for a row that positively says it is an
      // ORDER invoice. A missing billingType means the column was dropped from
      // the sheet, not that the invoice stopped being a CYCLE one, so neither
      // branch should reject it.
      if: {
        properties: {
          billingType: { const: 'ORDER' },
        },
        required: ['billingType'],
      },
      then: {
        properties: {
          billingPeriodStart: { type: 'null' },
          billingPeriodEnd: { type: 'null' },
        },
      },
    },
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
        sourceOrderId: {
          type: ['string', 'null'],
          description:
            'Order this line was billed from, or null when the line was added directly to the invoice. ' +
            'A CYCLE invoice combines several orders, so lines within one invoice can reference different orders.',
        },
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
          description:
            'Resolved item-level adjustments. In InvoiceItems these are applied per unit, so each amount ' +
            'here is already multiplied by quantity and represents the whole line ' +
            '(a FIXED -10 on quantity 10 appears as -100). netTotal equals subtotal plus the sum of these amounts.',
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
