// Schema for the customer-facing InvoiceView materialized view.
// Nested documents are stored as JSON strings in Google Sheets.

export const columns = [
  'invoiceNumber', 'status', 'issuedDate', 'dueDate',
  'customerJson', 'sourceOrderIdsJson', 'itemsJson', 'paymentsJson',
  'currency', 'subtotal', 'adjustmentTotal', 'grandTotal',
  'paidAmount', 'balanceDue',
];

export const dateColumns = new Set(['issuedDate', 'dueDate']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'InvoiceView',
  type: 'object',
  required: [
    'invoiceNumber', 'status', 'issuedDate', 'dueDate',
    'customerJson', 'sourceOrderIdsJson', 'itemsJson', 'paymentsJson',
    'currency', 'subtotal', 'adjustmentTotal', 'grandTotal',
    'paidAmount', 'balanceDue',
  ],
  additionalProperties: false,
  properties: {
    invoiceNumber:      { type: 'string' },
    status: {
      type: 'string',
      enum: ['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'VOID'],
    },
    issuedDate:         { type: 'string', format: 'date' },
    dueDate:            { type: 'string', format: 'date' },
    customerJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: { $ref: '#/$defs/customer' },
    },
    sourceOrderIdsJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    itemsJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/item' },
      },
    },
    paymentsJson: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'array',
        items: { $ref: '#/$defs/payment' },
      },
    },
    currency:           { type: 'string', pattern: '^[A-Z]{3}$' },
    subtotal:           { type: 'number' },
    adjustmentTotal:    { type: 'number' },
    grandTotal:         { type: 'number' },
    paidAmount:         { type: 'number', minimum: 0 },
    balanceDue:         { type: 'number' },
  },
  $defs: {
    customer: {
      type: 'object',
      required: ['customerName'],
      additionalProperties: false,
      properties: {
        customerIndex: { type: ['string', 'number', 'null'] },
        customerName:  { type: 'string' },
        phone:         { type: ['string', 'null'] },
        email:         { type: ['string', 'null'], format: 'email' },
        address:       { type: ['string', 'null'] },
      },
    },
    adjustment: {
      type: 'object',
      required: ['label', 'amount'],
      additionalProperties: false,
      properties: {
        label:  { type: 'string' },
        amount: { type: 'number' },
      },
    },
    item: {
      type: 'object',
      required: [
        'description', 'quantity', 'unitPrice',
        'subtotal', 'adjustments', 'netTotal',
      ],
      additionalProperties: false,
      properties: {
        sourceOrderId: { type: ['string', 'null'] },
        serviceType:   { type: ['string', 'null'] },
        description:   { type: 'string' },
        quantity:      { type: 'number' },
        unit:          { type: ['string', 'null'] },
        unitPrice:     { type: 'number' },
        subtotal:      { type: 'number' },
        adjustments: {
          type: 'array',
          items: { $ref: '#/$defs/adjustment' },
        },
        netTotal:      { type: 'number' },
      },
    },
    payment: {
      type: 'object',
      required: ['paymentId', 'amount', 'method', 'status'],
      additionalProperties: false,
      properties: {
        paymentId: { type: 'string' },
        amount:    { type: 'number', minimum: 0 },
        method: {
          type: 'string',
          enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'QR_PROMPTPAY', 'OTHER'],
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'VERIFIED', 'FAILED'],
        },
        paidAt:   { type: ['string', 'null'], format: 'date-time' },
        reference: { type: ['string', 'null'] },
        proofUrl:  { type: ['string', 'null'], format: 'uri' },
      },
    },
  },
};
