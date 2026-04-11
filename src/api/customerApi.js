const APPSCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzaibTaFzSS7Wqt7z04MEJxRVlvka9teyyVge3VNkEA5xNRUYtWIMwS1FTUHu0LxpIx/exec';

/**
 * Look up a customer by their customer ID (UUID).
 * @returns {{ status: 'found'|'not_found', data?: object }}
 */
import { lsGet, lsSet, lsGetStale } from './localCache';

const CACHE_PREFIX = 'mw_customer_';

async function _fetchAndCache(url, cacheKey) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AppScript responded ${res.status}`);
  const json = await res.json();
  if (json.status === 'found') lsSet(cacheKey, json);
  return json;
}

/**
 * Look up a customer by their customer ID (UUID).
 * Supports Stale-While-Revalidate: pass onRevalidate to receive fresh data in background.
 * @param {string} customerId
 * @param {function} [onRevalidate] - called with fresh data when stale cache is revalidated
 * @returns {{ status: 'found'|'not_found', data?: object }}
 */
export async function getCustomerById(customerId, onRevalidate) {
  const cacheKey = CACHE_PREFIX + `id_${customerId}`;
  const { value, isStale } = lsGetStale(cacheKey);

  if (value) {
    if (isStale) {
      const url = `${APPSCRIPT_URL}?customerId=${encodeURIComponent(customerId)}`;
      const fresh = _fetchAndCache(url, cacheKey);
      if (onRevalidate) fresh.then(onRevalidate).catch(() => {});
    }
    return value;
  }

  const url = `${APPSCRIPT_URL}?customerId=${encodeURIComponent(customerId)}`;
  return _fetchAndCache(url, cacheKey);
}

/**
 * Look up a customer by LINE User ID.
 * Supports Stale-While-Revalidate: pass onRevalidate to receive fresh data in background.
 * @param {string} lineUserId
 * @param {function} [onRevalidate] - called with fresh data when stale cache is revalidated
 * @returns {{ status: 'found'|'not_found', data?: object }}
 */
export async function getCustomerByLineId(lineUserId, onRevalidate) {
  const cacheKey = CACHE_PREFIX + `line_${lineUserId}`;
  const { value, isStale } = lsGetStale(cacheKey);

  if (value) {
    if (isStale) {
      const url = `${APPSCRIPT_URL}?lineUserId=${encodeURIComponent(lineUserId)}`;
      const fresh = _fetchAndCache(url, cacheKey);
      if (onRevalidate) fresh.then(onRevalidate).catch(() => {});
    }
    return value;
  }

  const url = `${APPSCRIPT_URL}?lineUserId=${encodeURIComponent(lineUserId)}`;
  return _fetchAndCache(url, cacheKey);
}

/**
 * Register a new customer.
 * @returns {{ status: 'success'|'phone_exists'|'error', existingCustomerId?: string, data?: object }}
 */
export async function registerCustomer({ firstName, lastName, phone, address, email, lineId }) {
  const res = await fetch(APPSCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      customerName: `${firstName} ${lastName}`.trim(),
      phone,
      address,
      email,
      lineId,
      updatedBy: 'liff',
    }),
  });
  if (!res.ok) throw new Error(`AppScript responded ${res.status}`);
  return res.json();
}

/**
 * Link a LINE userId to an existing customer record (UPDATE action).
 * Used when phone_exists but no lineId is set yet.
 */
export async function linkLineId(customerId, lineId) {
  const res = await fetch(APPSCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action: 'UPDATE',
      customerId,
      lineId,
      updatedBy: 'liff',
    }),
  });
  if (!res.ok) throw new Error(`AppScript responded ${res.status}`);
  return res.json();
}

const APPOINTMENT_URL =
  'https://script.google.com/macros/s/AKfycbzzCKX9LJkHB_4_y66GDZQTumMaA757yp2LDgVTaqmmnGQHfi68AKUaTIlwRSRKsykV/exec';

/**
 * Create a new PICKUP appointment.
 * @returns {{ status: 'success'|'error', data?: { appointmentId, row } }}
 */
export async function createAppointment({ customerId, appointmentDate, timeSlot, address, notes }) {
  const res = await fetch(APPOINTMENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      customerId,
      appointmentType: 'PICKUP',
      appointmentDate,
      timeSlot,
      address: address || '',
      notes:   notes   || '',
      createdBy: 'liff',
    }),
  });
  if (!res.ok) throw new Error(`AppScript responded ${res.status}`);
  return res.json();
}
