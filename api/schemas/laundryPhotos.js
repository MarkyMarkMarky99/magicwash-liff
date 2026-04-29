// Schema for LaundryPhotos sheet
// Spreadsheet: 1tfgJvjXMkH8MIoJ38No9-1DBdG7o0lcPG8dVhPCGw-E (shared with OrderForm)

export const columns = [
  'id', 'orderId', 'orderItemId', 'itemId', 'imagePath',
  'imageUrl', 'notes', 'timestamp', 'createdBy', 'updatedBy',
  'updatedAt', 'checked', 'isActive', 'fileId',
];

export const dateColumns = new Set(['timestamp', 'updatedAt']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'LaundryPhotos',
  type: 'object',
  required: ['id', 'orderId', 'itemId', 'imagePath', 'imageUrl', 'timestamp', 'updatedAt', 'fileId'],
  properties: {
    id:          { type: 'string' },
    orderId:     { type: 'string' },
    orderItemId: { type: ['string', 'null'] },
    itemId:      { type: 'string' },
    imagePath:   { type: 'string' },
    imageUrl:    { type: 'string' },
    notes:       { type: ['string', 'null'] },
    timestamp:   { type: 'string', format: 'date-time' },
    createdBy:   { type: ['string', 'null'] },
    updatedBy:   { type: ['string', 'null'] },
    updatedAt:   { type: 'string', format: 'date-time' },
    checked:     { type: ['boolean', 'null'] },
    isActive:    { type: ['string', 'null'] },
    fileId:      { type: 'string' },
  },
};
