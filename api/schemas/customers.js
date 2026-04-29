// Schema for Customers sheet
// Spreadsheet: 17stv4nymS8dXR1pdrYkwJSzvdJnfoDn7Z_22NPp8rOI

export const columns = [
  'timestamp', 'customerId', 'customerIndex', 'customerName', 'phone',
  'address', 'location', 'registeredDate', 'facebook', 'lineId',
  'whatsapp', 'email', 'customerType', 'source', 'scheduledDays',
  'lastVisitDate', 'preferredContactMethod', 'updatedAt', 'updatedBy', 'deletedAt',
];

export const dateColumns = new Set(['registeredDate', 'lastVisitDate']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Customers',
  type: 'object',
  required: ['timestamp', 'customerId', 'customerIndex', 'customerName'],
  properties: {
    timestamp:              { type: 'string' },
    customerId:             { type: 'string' },
    customerIndex:          { type: 'string' },
    customerName:           { type: 'string' },
    phone:                  { type: ['integer', 'null'] },
    address:                { type: ['string', 'null'] },
    location:               { type: ['string', 'null'] },
    registeredDate:         { type: ['string', 'null'], format: 'date' },
    facebook:               { type: ['string', 'null'] },
    lineId:                 { type: ['string', 'null'] },
    whatsapp:               { type: ['string', 'null'] },
    email:                  { type: ['string', 'null'] },
    customerType:           { type: ['string', 'null'], enum: ['Member', 'Regular', null] },
    source:                 { type: ['string', 'null'], enum: ['Facebook Ads', 'Google Ads', null] },
    scheduledDays:          { type: ['string', 'null'] },
    lastVisitDate:          { type: ['string', 'null'], format: 'date' },
    preferredContactMethod: { type: ['string', 'null'], enum: ['Line', 'Messenger', null] },
    updatedAt:              { type: ['string', 'null'] },
    updatedBy:              { type: ['string', 'null'] },
    deletedAt:              { type: ['string', 'null'] },
  },
};
