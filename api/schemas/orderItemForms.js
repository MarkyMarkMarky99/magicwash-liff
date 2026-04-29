// Schema for OrderItemForms sheet
// Spreadsheet: 1tfgJvjXMkH8MIoJ38No9-1DBdG7o0lcPG8dVhPCGw-E (shared with OrderForm)

export const columns = [
  'id', 'orderId', 'itemId', 'description', 'quantity',
  'price', 'creditsUsed', 'timestamp', 'category', 'serviceType',
  'specialInstructions', 'createdBy', 'updatedAt', 'updatedBy', 'invoiceItemId',
];

export const dateColumns = new Set(['timestamp', 'updatedAt']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'OrderItemForms',
  type: 'object',
  required: ['id', 'orderId', 'description', 'quantity', 'timestamp', 'category'],
  properties: {
    id:                  { type: 'string' },
    orderId:             { type: 'string' },
    itemId:              { type: ['string', 'null'] },
    description:         { type: 'string' },
    quantity:            { type: 'number' },
    price:               { type: ['number', 'null'] },
    creditsUsed:         { type: ['number', 'null'] },
    timestamp:           { type: 'string', format: 'date-time' },
    category:            { type: 'string', enum: ['Tops', 'Bottoms', 'Bedding'] },
    serviceType:         { type: ['string', 'null'] },
    specialInstructions: { type: ['string', 'null'] },
    createdBy:           { type: ['string', 'null'] },
    updatedAt:           { type: ['string', 'null'], format: 'date-time' },
    updatedBy:           { type: ['string', 'null'] },
    invoiceItemId:       { type: ['string', 'null'] },
  },
};
