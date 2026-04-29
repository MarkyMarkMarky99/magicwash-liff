// Schema for Orders sheet (NoSQL-style documents)
// Spreadsheet: 17q2MNTACBUoNzjPvUYZZ-lN5mUl38RokKvuYx3cwyes

export const columns = [
  'orderId', 'orderNumber', 'orderName', 'orderDescription', 'invoiceId',
  'status', 'serviceTier', 'channel', 'receivedDate', 'dueDate',
  'customer', 'financialSummary', 'payment', 'notes', 'tags',
  'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt',
  'deletedBy',
];

export const dateColumns = new Set(['receivedDate', 'dueDate', 'createdAt', 'updatedAt', 'deletedAt']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Orders',
  type: 'object',
  required: [
    'orderId', 'orderNumber', 'status', 'serviceTier', 'channel',
    'receivedDate', 'dueDate', 'customer', 'financialSummary', 'payment',
    'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
  ],
  properties: {
    orderId:          { type: 'string' },
    orderNumber:      { type: 'string' },
    orderName:        { type: ['string', 'null'] },
    orderDescription: { type: ['string', 'null'] },
    invoiceId:        { type: ['string', 'null'] },
    status:           { type: 'string', enum: ['pending', 'received', 'in_progress', 'ready', 'completed'] },
    serviceTier:      { type: 'string', enum: ['express', 'standard', 'economy'] },
    channel:          { type: 'string', enum: ['walk_in', 'line', 'phone', 'app'] },
    receivedDate:     { type: 'string', format: 'date-time' },
    dueDate:          { type: 'string', format: 'date-time' },
    customer:         { type: 'string' },
    financialSummary: { type: 'string' },
    payment:          { type: 'string' },
    notes:            { type: ['string', 'null'] },
    tags:             { type: ['string', 'null'] },
    createdAt:        { type: 'string', format: 'date-time' },
    createdBy:        { type: 'string' },
    updatedAt:        { type: 'string', format: 'date-time' },
    updatedBy:        { type: 'string' },
    deletedAt:        { type: ['string', 'null'], format: 'date-time' },
    deletedBy:        { type: ['string', 'null'] },
  },
};
