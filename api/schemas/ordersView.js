// Schema for OrdersView materialized view
// Spreadsheet: 1ucqeUqRN25L4YF1GEnjP02ex_IohR1f8h8IwaP_EBRQ (MagicwashPortal)

export const columns = [
  'orderId', 'customerId', 'orderNumber', 'receivedDate', 'dueDate',
  'serviceType', 'status', 'quantity', 'note', 'itemsJson',
  'syncedAt', 'createdAt',
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
    receivedDate:{ type: ['string', 'null'], format: 'date' },
    dueDate:     { type: ['string', 'null'], format: 'date' },
    serviceType: { type: ['string', 'null'], enum: ['ซักรีด', 'ซักแห้ง', null] },
    status:      { type: ['string', 'null'], enum: ['CONFIRM', 'SUBMITTED', null] },
    quantity:    { type: ['string', 'null'] },
    note:        { type: ['string', 'null'] },
    itemsJson:   { type: ['string', 'null'] },
    syncedAt:    { type: 'string', format: 'date-time' },
    createdAt:   { type: ['string', 'null'], format: 'date-time' },
  },
};
