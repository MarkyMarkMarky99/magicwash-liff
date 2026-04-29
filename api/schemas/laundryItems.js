// Schema for LaundryItems sheet
// Spreadsheet: 1bB4QtQi3YHc5yg0HhBmPYP7kviBRsTx2juXdZl1Maik

export const columns = [
  'itemId', 'orderId', 'orderItemId', 'status', 'category',
  'subCategory', 'itemType', 'variant', 'brand', 'color',
  'size', 'material', 'pattern', 'visualDescription', 'careInstructions',
  'imageUrl', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
  'deletedAt', 'deletedBy',
];

export const dateColumns = new Set(['createdAt', 'updatedAt']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'LaundryItems',
  type: 'object',
  required: [
    'itemId', 'orderId', 'orderItemId', 'status', 'category',
    'subCategory', 'itemType', 'color', 'size', 'material',
    'pattern', 'visualDescription', 'imageUrl', 'createdAt', 'createdBy',
    'updatedAt', 'updatedBy',
  ],
  properties: {
    itemId:            { type: 'string' },
    orderId:           { type: 'string' },
    orderItemId:       { type: 'string' },
    status:            { type: 'string', enum: ['CLASSIFIED'] },
    category:          { type: 'string', enum: ['Bedding', 'Clothing'] },
    subCategory:       { type: 'string', enum: ['Bedsheet', 'Bottoms', 'Comforter', 'Pillow', 'Tops'] },
    itemType:          { type: 'string', enum: ['Bedding Set 6ft', 'Double Comforter', 'Pants', 'Pillow', 'Polo Shirt'] },
    variant:           { type: ['string', 'null'] },
    brand:             { type: ['string', 'null'], enum: ['NEPS', null] },
    color:             { type: 'string' },
    size:              { type: 'string', enum: ['Unknown'] },
    material:          { type: 'string', enum: ['Cotton', 'Cotton blend', 'Cotton/Linen', 'Synthetic blend'] },
    pattern:           { type: 'string', enum: ['Checkered', 'Solid'] },
    visualDescription: { type: 'string' },
    careInstructions:  { type: ['string', 'null'] },
    imageUrl:          { type: 'string' },
    createdAt:         { type: 'string', format: 'date-time' },
    createdBy:         { type: 'string', enum: ['local'] },
    updatedAt:         { type: 'string', format: 'date-time' },
    updatedBy:         { type: 'string', enum: ['gemini-cli'] },
    deletedAt:         { type: ['string', 'null'] },
    deletedBy:         { type: ['string', 'null'] },
  },
};
