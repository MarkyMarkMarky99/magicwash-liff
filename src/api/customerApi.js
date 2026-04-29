import { cacheKey, swrFetch, fetchAndCache, lsClear, apiPost, gvizStr } from './localCache';

const CUSTOMER_ID_RE = /^[A-Za-z0-9]{8}$/;
const LINE_ID_RE     = /^U[0-9a-f]{32}$/i;


function resolveIdParam(id) {
  if (CUSTOMER_ID_RE.test(id)) return { lookupCol: 'B', key: cacheKey('customer', id), isLineId: false };
  if (LINE_ID_RE.test(id)) return { lookupCol: 'J', key: cacheKey('customer:line', id), isLineId: true };
  throw new Error(`[customerApi] Invalid ID format: "${id}"`);
}

/**
 * Look up a customer profile by customer ID or LINE user ID.
 * ID type is detected automatically by format.
 * Returns only customer fields — orders are fetched separately via orderApi.
 */
const CUSTOMER_COLS = 'customerId,customerIndex,customerName,phone,address,location,registeredDate,facebook,lineId,whatsapp,email,customerType,source,scheduledDays,lastVisitDate,preferredContactMethod';

export async function getCustomerById(id, onRevalidate) {
  const { lookupCol, key, isLineId } = resolveIdParam(id);
  const tq = `SELECT * WHERE ${lookupCol}='${gvizStr(id)}' LIMIT 1`;
  const url = `/api/gviz?source=customers&tq=${encodeURIComponent(tq)}&cols=${encodeURIComponent(CUSTOMER_COLS)}`;

  if (isLineId) {
    const rows = await fetchAndCache(url, key);
    if (!rows.length) lsClear(key);
    return rows[0] ?? null;
  }

  const rows = await swrFetch(url, key, undefined,
    onRevalidate ? (rows) => onRevalidate(rows[0] ?? null) : null
  );
  return rows[0] ?? null;
}

/** @deprecated Use getCustomerById — it detects LINE IDs automatically. */
export function getCustomerByLineId(lineUserId, onRevalidate) {
  console.warn('[customerApi] getCustomerByLineId is deprecated — use getCustomerById');
  return getCustomerById(lineUserId, onRevalidate);
}

export function registerCustomer({ firstName, lastName, phone, address, email, lineId }) {
  return apiPost('customer', {
    customerName: `${firstName} ${lastName}`.trim(),
    phone,
    address,
    email,
    lineId,
    updatedBy: 'liff',
  });
}

export function updateCustomer(customerId, fields = {}) {
  const customerName = `${fields.firstName ?? ''} ${fields.lastName ?? ''}`.trim();
  const payload = {
    action: 'UPDATE',
    customerId,
    updatedBy: 'liff',
  };

  if (customerName) payload.customerName = customerName;
  if (fields.phone?.trim()) payload.phone = fields.phone.trim();
  if (fields.address?.trim()) payload.address = fields.address.trim();
  if (fields.email?.trim()) payload.email = fields.email.trim();
  if (fields.lineId?.trim()) payload.lineId = fields.lineId.trim();

  return apiPost('customer', payload);
}

export function linkLineId(customerId, lineId, fields = {}) {
  return updateCustomer(customerId, { ...fields, lineId });
}

export function createAppointment({ customerId, appointmentDate, timeSlot, address, notes, type = 'pickup', orderId }) {
  return apiPost('appointment', {
    customerId,
    appointmentType: type === 'delivery' ? 'DELIVERY' : 'PICKUP',
    appointmentDate,
    timeSlot,
    address:   address || '',
    notes:     notes   || '',
    ...(orderId ? { deliveryOrderId: orderId } : {}),
    createdBy: 'liff',
  });
}
