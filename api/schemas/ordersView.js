// Schema for OrdersView materialized view
// Spreadsheet: 1ucqeUqRN25L4YF1GEnjP02ex_IohR1f8h8IwaP_EBRQ (MagicwashPortal)

export const columns = [
  'orderId', 'customerId', 'orderNumber', 'invoiceNumber', 'receivedDate', 'dueDate',
  'serviceType', 'status', 'quantity', 'note', 'itemsJson',
  'syncedAt', 'createdAt',
];

export const headers = [
  'order_id', 'customer_id', 'order_number', 'invoice_number', 'received_date', 'due_date',
  'service_type', 'status', 'quantity', 'note', 'items_json',
  'synced_at', 'created_at',
];

export const dateColumns = new Set(['receivedDate', 'dueDate', 'syncedAt', 'createdAt']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'OrdersView',
  type: 'object',
  required: ['orderId', 'customerId', 'syncedAt'],
  properties: {
    orderId:     { type: 'string' },
    customerId:  { type: 'string' },
    orderNumber: { type: ['string', 'null'] },
    invoiceNumber: { type: ['string', 'null'] },
    receivedDate:{ type: ['string', 'null'], format: 'date' },
    dueDate:     { type: ['string', 'null'], format: 'date' },
    serviceType: { type: ['string', 'null'], enum: ['ซักรีด', 'ซักแห้ง', null] },
    status:      { type: ['string', 'null'], enum: ['SUBMITTED', 'PENDING', 'APPROVED', 'CONFIRM', 'RECEIVED', 'COMPLETED', null] },
    quantity:    { type: ['string', 'null'] },
    note:        { type: ['string', 'null'] },
    itemsJson:   { type: ['string', 'null'] },
    syncedAt:    { type: 'string', format: 'date-time' },
    createdAt:   { type: ['string', 'null'], format: 'date-time' },
  },
};
