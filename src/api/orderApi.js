const ORDER_API_URL =
  'https://script.google.com/macros/s/AKfycbzCGcGxe45YoGlwc82kCqbP63ODuhMQ6fNh9Dro2bY4p57FBPRx2dUCtb5GEfuPquXZ/exec';

import { lsGet, lsSet, lsGetStale } from './localCache';

const CACHE_PREFIX = 'mw_order_';

async function _fetchAndCache(url, cacheKey) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status === 'found') lsSet(cacheKey, json);
  return json;
}

/**
 * Fetch order details by orderId.
 * Supports Stale-While-Revalidate: pass onRevalidate to receive fresh data in background.
 * @param {string} orderId
 * @param {function} [onRevalidate] - called with fresh data when stale cache is revalidated
 */
export async function getOrderById(orderId, onRevalidate) {
  const cacheKey = CACHE_PREFIX + orderId;
  const { value, isStale } = lsGetStale(cacheKey);

  if (value) {
    if (isStale) {
      const url = `${ORDER_API_URL}?orderId=${encodeURIComponent(orderId)}`;
      const fresh = _fetchAndCache(url, cacheKey);
      if (onRevalidate) fresh.then(onRevalidate).catch(() => {});
    }
    return value;
  }

  const url = `${ORDER_API_URL}?orderId=${encodeURIComponent(orderId)}`;
  return _fetchAndCache(url, cacheKey);
}
