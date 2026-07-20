// Schema for Appointments sheet
// Spreadsheet: GVIZ_APPOINTMENTS_SPREADSHEET_ID (1CvVl6aF60kly0MFjvw4WpBFhMIgRqoKqxfqi2665zLM)
//
// Note: the `address` column (G) stores a JSON blob (name/phone/address/…),
// not a plain string. Do not treat it as a display address.

export const columns = [
  'appointmentId', 'customerId', 'appointmentType', 'appointmentDate', 'timeSlot',
  'status', 'address', 'pickupOrderId', 'deliveryOrderId', 'notes',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'serviceTier',
  'deletedAt', 'deletedBy',
];

// Only appointmentDate is a true date cell (Date(y,m,d)); createdAt/updatedAt are
// datetime/string and are intentionally left raw.
export const dateColumns = new Set(['appointmentDate']);

export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Appointments',
  type: 'object',
  required: ['appointmentId', 'customerId', 'appointmentType', 'appointmentDate', 'status'],
  properties: {
    appointmentId:   { type: 'string' },
    customerId:      { type: 'string' },
    appointmentType: { type: 'string', enum: ['PICKUP', 'DELIVERY', 'PICKUP_DELIVERY'] },
    appointmentDate: { type: ['string', 'null'], format: 'date' },
    timeSlot:        { type: ['string', 'null'] },
    status:          { type: ['string', 'null'], enum: ['CONFIRMED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', null] },
    address:         { type: ['string', 'null'] },
    pickupOrderId:   { type: ['string', 'null'] },
    deliveryOrderId: { type: ['string', 'null'] },
    notes:           { type: ['string', 'null'] },
    createdAt:       { type: ['string', 'null'] },
    updatedAt:       { type: ['string', 'null'] },
    createdBy:       { type: ['string', 'null'] },
    updatedBy:       { type: ['string', 'null'] },
    serviceTier:     { type: ['string', 'null'] },
    deletedAt:       { type: ['string', 'null'] },
    deletedBy:       { type: ['string', 'null'] },
  },
};
