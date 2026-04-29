// Schema for OrderItems sheet
// Spreadsheet: 17q2MNTACBUoNzjPvUYZZ-lN5mUl38RokKvuYx3cwyes (shared with Orders)

export const columns = [
  'orderId', 'itemId', 'sku', 'serviceType', 'description',
  'quantity', 'unit', 'addOns', 'pricing', 'notes',
];

export const dateColumns = new Set();

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'OrderItems',
  type: 'object',
  required: ['orderId', 'itemId', 'quantity', 'addOns', 'pricing'],
  properties: {
    orderId:     { type: 'string' },
    itemId:      { type: 'string' },
    sku:         { type: ['string', 'null'] },
    serviceType: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    quantity:    { type: 'number' },
    unit:        { type: ['string', 'null'] },
    addOns:      { type: 'string' },
    pricing:     { type: 'string' },
    notes:       { type: ['string', 'null'] },
  },
};
