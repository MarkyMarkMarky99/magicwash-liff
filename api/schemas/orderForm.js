// Schema for OrderForm sheet
// Spreadsheet: 1tfgJvjXMkH8MIoJ38No9-1DBdG7o0lcPG8dVhPCGw-E

export const columns = [
  'id', 'orderNumber', 'customerId', 'receivedDate', 'dueDate',
  'serviceType', 'status', 'quantity', 'hangers', 'bags',
  'hangersImage', 'bagsImage', 'formImage', 'note', 'timestamp',
  'createdBy', 'updatedAt', 'updatedBy', 'invoiceId', 'orderName',
  'orderDescription',
];

export const dateColumns = new Set(['receivedDate', 'dueDate', 'timestamp', 'updatedAt']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'OrderForm',
  type: 'object',
  required: [],
  properties: {
    id:               { type: ['string', 'null'] },
    orderNumber:      { type: ['string', 'null'] },
    customerId:       { type: ['string', 'null'] },
    receivedDate:     { type: ['string', 'null'], format: 'date' },
    dueDate:          { type: ['string', 'null'], format: 'date' },
    serviceType:      { type: ['string', 'null'], enum: ['ซักรีด', 'ซักแห้ง', null] },
    status:           { type: ['string', 'null'], enum: ['CONFIRM', 'SUBMITTED', null] },
    quantity:         { type: ['string', 'null'] },
    hangers:          { type: ['boolean', 'null'] },
    bags:             { type: ['boolean', 'null'] },
    hangersImage:     { type: ['string', 'null'] },
    bagsImage:        { type: ['string', 'null'] },
    formImage:        { type: ['string', 'null'] },
    note:             { type: ['string', 'null'] },
    timestamp:        { type: ['string', 'null'], format: 'date-time' },
    createdBy:        { type: ['string', 'null'] },
    updatedAt:        { type: ['string', 'null'], format: 'date-time' },
    updatedBy:        { type: ['string', 'null'] },
    invoiceId:        { type: ['string', 'null'] },
    orderName:        { type: ['string', 'null'] },
    orderDescription: { type: ['string', 'null'] },
  },
};
