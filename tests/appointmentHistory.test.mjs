import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import {
  getCustomerAppointments, getWaitingPickups, getAppointmentsFresh,
  filterAppointmentHistory, filterWaitingPickups, findBlockingAppointment,
  clearAppointmentsCache, todayBangkokStr,
} from '../src/api/appointmentApi.js';
import { cacheKey, lsGet, lsSet } from '../src/api/localCache.js';

const customerId = 'CUS-APPOINTMENT-FIXTURE';
function day(offset) {
  const date = new Date(`${todayBangkokStr()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function appointment(overrides = {}) {
  return { appointmentId: 'APT-001', customerId, appointmentType: 'PICKUP',
    appointmentDate: day(1), timeSlot: '10:00-12:00', status: 'CONFIRMED',
    deletedAt: null, ...overrides };
}

test('history includes past pickups, deliveries, combined, completed, cancelled and pending', () => {
  const rows = [
    appointment({ appointmentId: 'past-pickup', appointmentDate: day(-5), status: 'COMPLETED' }),
    appointment({ appointmentId: 'past-delivery', appointmentType: 'DELIVERY', appointmentDate: day(-3), status: 'COMPLETED' }),
    appointment({ appointmentId: 'combined', appointmentType: 'PICKUP_DELIVERY', appointmentDate: day(-1), status: 'CONFIRMED' }),
    appointment({ appointmentId: 'cancelled', appointmentDate: day(-2), status: 'CANCELLED' }),
    appointment({ appointmentId: 'future-pending', appointmentDate: day(2), status: 'PENDING' }),
    appointment({ appointmentId: 'deleted', deletedAt: '2026-10-01T10:00:00Z' }),
  ];
  const history = filterAppointmentHistory(rows);
  assert.deepEqual(history.map((row) => row.appointmentId),
    ['future-pending', 'combined', 'cancelled', 'past-delivery', 'past-pickup']);
  assert.equal(history.find((row) => row.appointmentId === 'combined').status, 'CONFIRMED');
  assert.equal(history.find((row) => row.appointmentId === 'cancelled').status, 'CANCELLED');
});

test('history preserves unknown/invalid dates with null placeholders sorted last', () => {
  const history = filterAppointmentHistory([
    appointment({ appointmentId: 'unknown', appointmentDate: null }),
    appointment({ appointmentId: 'impossible', appointmentDate: '2026-02-31' }),
    appointment({ appointmentId: 'malformed', appointmentDate: 'not-a-date' }),
    appointment({ appointmentId: 'dated', appointmentDate: '2026-01-01' }),
  ]);
  assert.equal(history[0].appointmentId, 'dated');
  assert.ok(history.slice(1).every((row) => row.appointmentDate === null));
  assert.equal(history.length, 4);
});

test('history normalizes sheet date forms and types without mutating source or inferring status', () => {
  const rows = [
    appointment({ appointmentId: 'ddmm', appointmentDate: '17/04/2026', appointmentType: ' delivery ', status: ' confirmed ' }),
    appointment({ appointmentId: 'gviz', appointmentDate: 'Date(2026,4,11)' }),
    appointment({ appointmentId: 'datetime', appointmentDate: '2026-04-20T10:00:00Z' }),
  ];
  const snapshot = structuredClone(rows);
  const history = filterAppointmentHistory(rows);
  assert.deepEqual(history.map((row) => row.appointmentDate), ['2026-05-11', '2026-04-20', '2026-04-17']);
  assert.equal(history[2].appointmentType, 'DELIVERY');
  assert.equal(history[2].status, 'CONFIRMED');
  assert.deepEqual(rows, snapshot);
});

test('history is safe for missing collection and invalid rows', () => {
  for (const invalid of [null, undefined, {}, 'bad']) assert.deepEqual(filterAppointmentHistory(invalid), []);
  assert.equal(filterAppointmentHistory([null, 1, appointment()]).length, 1);
});

test('Orders upcoming list retains only active future pickups, oldest first', () => {
  const rows = [
    appointment({ appointmentId: 'later', appointmentDate: day(3) }),
    appointment({ appointmentId: 'soon', appointmentDate: day(1), status: 'IN_TRANSIT' }),
    appointment({ appointmentId: 'past', appointmentDate: day(-1) }),
    appointment({ appointmentId: 'delivery', appointmentType: 'DELIVERY' }),
    appointment({ appointmentId: 'combined', appointmentType: 'PICKUP_DELIVERY' }),
    appointment({ appointmentId: 'completed', status: 'COMPLETED' }),
    appointment({ appointmentId: 'cancelled', status: 'CANCELLED' }),
    appointment({ appointmentId: 'deleted', deletedAt: 'now' }),
    appointment({ appointmentId: 'unknown', appointmentDate: 'unknown' }),
  ];
  assert.deepEqual(filterWaitingPickups(rows).map((row) => row.appointmentId), ['soon', 'later']);
  assert.equal(filterAppointmentHistory(rows).length, 8);
});

test('pickup booking guards remain fail-closed for active unknown dates, ignoring historical/combined/deleted', () => {
  const invalidDate = appointment({ appointmentId: 'unknown', appointmentDate: 'unknown' });
  assert.equal(findBlockingAppointment([invalidDate], { type: 'pickup' }).appointmentId, 'unknown');
  assert.equal(findBlockingAppointment([
    appointment({ appointmentDate: day(-1) }),
    appointment({ appointmentType: 'PICKUP_DELIVERY' }),
    appointment({ status: 'COMPLETED' }),
    appointment({ status: 'CANCELLED' }),
    appointment({ deletedAt: 'now' }),
  ], { type: 'pickup' }), null);
  const rows = [
    appointment({ appointmentId: 'later', appointmentDate: day(3) }),
    appointment({ appointmentId: 'soon', appointmentDate: day(1) }),
  ];
  assert.equal(findBlockingAppointment(rows, { type: 'pickup' }).appointmentId, 'soon');
});

test('delivery booking guard still requires same order and excludes combined pickup-delivery', () => {
  const rows = [
    appointment({ appointmentId: 'wrong', appointmentType: 'DELIVERY', deliveryOrderId: 'ORD-OTHER' }),
    appointment({ appointmentId: 'combined', appointmentType: 'PICKUP_DELIVERY', deliveryOrderId: 'ORD-1' }),
    appointment({ appointmentId: 'same', appointmentType: 'DELIVERY', deliveryOrderId: 'ORD-1', appointmentDate: 'unknown' }),
  ];
  assert.equal(findBlockingAppointment(rows, { type: 'delivery', orderId: 'ORD-1' }).appointmentId, 'same');
  assert.equal(findBlockingAppointment(rows, { type: 'delivery', orderId: 'ORD-2' }), null);
});

function withNetwork(t, handler) {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.fetch = async (url) => handler(new URL(url, 'http://fixture.local'));
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  });
}
function response(rows) { return { ok: true, json: async () => rows }; }

test('shared display read serves both histories and upcoming cards with one request', async (t) => {
  let reads = 0;
  const rows = [
    appointment({ appointmentId: 'upcoming' }),
    appointment({ appointmentId: 'historical', appointmentDate: day(-4), status: 'COMPLETED' }),
    appointment({ appointmentId: 'delivery', appointmentType: 'DELIVERY', appointmentDate: day(-3) }),
  ];
  withNetwork(t, (url) => {
    reads++;
    assert.equal(url.searchParams.get('filterValue'), customerId);
    assert.match(url.searchParams.get('cols'), /appointmentType/);
    assert.match(url.searchParams.get('cols'), /deletedAt/);
    return response(rows);
  });
  const displayRows = await getCustomerAppointments(customerId);
  assert.equal(filterAppointmentHistory(displayRows).length, 3);
  assert.equal(filterWaitingPickups(displayRows).length, 1);
  assert.equal((await getWaitingPickups(customerId)).length, 1);
  assert.equal(reads, 1);
});

test('stale raw display callback refreshes both history and upcoming views from one response', async (t) => {
  const fresh = [
    appointment({ appointmentId: 'new-upcoming' }),
    appointment({ appointmentId: 'past-delivery', appointmentType: 'DELIVERY', appointmentDate: day(-1) }),
  ];
  withNetwork(t, () => response(fresh));
  lsSet(cacheKey('appointments', customerId), [appointment({ appointmentId: 'old' })], -1);
  let revalidated;
  const cached = await getCustomerAppointments(customerId, (rows) => { revalidated = rows; });
  assert.equal(cached[0].appointmentId, 'old');
  await setImmediate();
  assert.equal(filterAppointmentHistory(revalidated).length, 2);
  assert.deepEqual(filterWaitingPickups(revalidated).map((row) => row.appointmentId), ['new-upcoming']);
});

test('clearing shared cache after booking/manual refresh reloads history and waiting pickups', async (t) => {
  const before = [appointment({ appointmentId: 'completed', appointmentDate: day(-2), status: 'COMPLETED' })];
  const after = [...before, appointment({ appointmentId: 'booked' })];
  let reads = 0;
  withNetwork(t, () => { reads++; return response(after); });
  lsSet(cacheKey('appointments', customerId), before);
  assert.equal(filterAppointmentHistory(await getCustomerAppointments(customerId)).length, 1);
  assert.equal(reads, 0);
  clearAppointmentsCache(customerId);
  const refreshed = await getCustomerAppointments(customerId);
  assert.equal(filterAppointmentHistory(refreshed).length, 2);
  assert.deepEqual(filterWaitingPickups(refreshed).map((row) => row.appointmentId), ['booked']);
  assert.equal(reads, 1);
});

test('fresh booking guard read bypasses display cache and seeds even an empty result', async (t) => {
  let reads = 0;
  withNetwork(t, () => { reads++; return response([]); });
  lsSet(cacheKey('appointments', customerId), [appointment()]);
  const fresh = await getAppointmentsFresh(customerId);
  assert.deepEqual(fresh, []);
  assert.equal(reads, 1);
  assert.deepEqual(lsGet(cacheKey('appointments', customerId)), []);
  assert.deepEqual(await getCustomerAppointments(customerId), []);
  assert.equal(reads, 1);
});

test('fresh booking guard read throws on upstream failure instead of trusting cached data', async (t) => {
  withNetwork(t, () => ({ ok: false, status: 502 }));
  lsSet(cacheKey('appointments', customerId), []);
  await assert.rejects(getAppointmentsFresh(customerId), /HTTP 502/);
  assert.deepEqual(lsGet(cacheKey('appointments', customerId)), []);
});