import { cacheKey, gvizSwrFetch, gvizUrl, lsSet, lsClear } from './localCache';

// Columns fetched for both the booking guard and the "waiting for pickup" list.
// Same set for both callers so the shared cache entry stays consistent.
// `address` (a JSON blob) is intentionally excluded.
const APPT_COLS = 'appointmentId,customerId,appointmentType,appointmentDate,timeSlot,status,pickupOrderId,deliveryOrderId,notes,deletedAt,createdAt';

const ACTIVE_STATUSES = new Set(['CONFIRMED', 'IN_TRANSIT']);

// --- normalisation helpers ---

const normId   = (v) => String(v ?? '').trim();
const normType = (v) => String(v ?? '').trim().toUpperCase();

function isActiveStatus(status) {
  return ACTIVE_STATUSES.has(String(status ?? '').trim().toUpperCase());
}

function notDeleted(appt) {
  return normId(appt?.deletedAt) === '';
}

/**
 * Normalise an appointmentDate cell to a canonical 'YYYY-MM-DD' string.
 * The server already converts real date cells via gvizDateToISO, but this
 * stays defensive against datetime, DD/MM/YYYY, and malformed values.
 * Returns null when the value cannot be interpreted as a date.
 */
function toISODateStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  let y, mo, d, m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)))            { y = +m[1]; mo = +m[2];     d = +m[3]; }
  else if ((m = s.match(/^Date\((\d+),(\d+),(\d+)/)))        { y = +m[1]; mo = +m[2] + 1; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)))  { y = +m[3]; mo = +m[2];     d = +m[1]; }
  else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; // reject out-of-range (e.g. 2026-99-99)
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Today's date in the business timezone (Asia/Bangkok), as 'YYYY-MM-DD'. */
export function todayBangkokStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function byDateAsc(a, b) {
  const da = toISODateStr(a.appointmentDate) ?? '9999-12-31';
  const db = toISODateStr(b.appointmentDate) ?? '9999-12-31';
  return da < db ? -1 : da > db ? 1 : 0;
}

// --- reads ---

function apptFilterSpec(customerId) {
  return { filterField: 'customerId', filterValue: customerId };
}

/**
 * Fresh, cache-bypassing read used by the booking guard.
 * Never trusts SWR cache, so the block/allow decision is based on current data.
 * Seeds the shared cache on success; throws on failure so callers can fail closed.
 */
export async function getAppointmentsFresh(customerId) {
  const url = gvizUrl({ source: 'appointments', ...apptFilterSpec(customerId), cols: APPT_COLS });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  // Always overwrite the shared cache — even with [] — so a cancelled/emptied list
  // is reflected by the display read (fetchAndCache would skip an empty result).
  lsSet(cacheKey('appointments', customerId), rows);
  return rows;
}

/**
 * SWR read used for display (the "waiting for pickup" cards).
 * Returns upcoming, active PICKUP appointments, soonest first.
 * Display-tolerant: stale-while-revalidate is fine here.
 */
export async function getWaitingPickups(customerId, onRevalidate) {
  const rows = await gvizSwrFetch(
    'appointments',
    apptFilterSpec(customerId),
    customerId,
    undefined,
    onRevalidate ? (rows) => onRevalidate(filterWaitingPickups(rows)) : null,
    APPT_COLS,
  );
  return filterWaitingPickups(rows);
}

/** Invalidate the shared appointments cache (call after a successful booking). */
export function clearAppointmentsCache(customerId) {
  lsClear(cacheKey('appointments', customerId));
}

// --- rules ---

/**
 * Upcoming active PICKUP appointments for the "waiting for pickup" list.
 * Excludes unparseable-date rows so stale ghost data never renders a card.
 */
export function filterWaitingPickups(list) {
  const today = todayBangkokStr();
  return (list || [])
    .filter((a) => normType(a.appointmentType) === 'PICKUP' && isActiveStatus(a.status) && notDeleted(a))
    .filter((a) => {
      const d = toISODateStr(a.appointmentDate);
      return d !== null && d >= today;
    })
    .sort(byDateAsc);
}

/**
 * Returns the appointment that should BLOCK a new booking, or null.
 * Rule (client-only enforcement):
 *  - same kind: pickup ⇒ existing PICKUP; delivery ⇒ existing DELIVERY with the same order
 *    (PICKUP_DELIVERY rows are ignored per product decision)
 *  - status active (CONFIRMED / IN_TRANSIT), not soft-deleted
 *  - appointmentDate >= today (Asia/Bangkok); an active row with an unparseable
 *    date blocks (fail-closed)
 * When several match, the soonest-dated one is returned.
 */
export function findBlockingAppointment(list, { type, orderId }) {
  const today = todayBangkokStr();
  const wantDelivery = type === 'delivery';

  const blockers = (list || []).filter((a) => {
    if (!isActiveStatus(a.status) || !notDeleted(a)) return false;
    const t = normType(a.appointmentType);
    if (wantDelivery) {
      if (t !== 'DELIVERY') return false;
      if (normId(a.deliveryOrderId) !== normId(orderId)) return false;
    } else if (t !== 'PICKUP') {
      return false;
    }
    const d = toISODateStr(a.appointmentDate);
    if (d === null) return true; // active but unparseable date → fail-closed
    return d >= today;
  });

  if (!blockers.length) return null;
  return blockers.sort(byDateAsc)[0];
}

// --- locks (module-level, survive component remounts within the session) ---

const inFlight = new Set();
const recentBookings = new Map(); // key -> expiresAt (ms)
const RECENT_BOOKING_TTL = 3 * 60 * 1000;

export function bookingKey({ customerId, type, orderId }) {
  return `${normId(customerId)}|${type === 'delivery' ? 'DELIVERY' : 'PICKUP'}|${normId(orderId)}`;
}

/** True if a booking with this key is already being submitted. */
export function isBookingInFlight(key) {
  return inFlight.has(key);
}

/** Try to claim the in-flight lock; false if already held. */
export function acquireBookingLock(key) {
  if (inFlight.has(key)) return false;
  inFlight.add(key);
  return true;
}

export function releaseBookingLock(key) {
  inFlight.delete(key);
}

/** Record a just-succeeded booking so an immediate re-entry stays blocked while GViz catches up. */
export function markRecentBooking(key) {
  recentBookings.set(key, Date.now() + RECENT_BOOKING_TTL);
}

/** True if this key was booked very recently (bridges GViz read lag after append). */
export function hasRecentBooking(key) {
  const expiresAt = recentBookings.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    recentBookings.delete(key);
    return false;
  }
  return true;
}

// Uncertain writes: a POST that failed/timed out may or may not have appended.
// Tracked at module level so protection survives navigating away and remounting —
// a fresh BookPickup re-reads and forces a recheck before it can submit again.
const uncertainBookings = new Map(); // key -> expiresAt (ms)

export function markUncertainBooking(key) {
  uncertainBookings.set(key, Date.now() + RECENT_BOOKING_TTL);
}

export function clearUncertainBooking(key) {
  uncertainBookings.delete(key);
}

export function hasUncertainBooking(key) {
  const expiresAt = uncertainBookings.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    uncertainBookings.delete(key);
    return false;
  }
  return true;
}
