import { gvizSwrFetch, cacheKey, lsSet, gvizStr } from './localCache';

const ORDERS_VIEW_COLS = 'orderId,customerId,orderNumber,receivedDate,dueDate,serviceType,status,quantity,note,itemsJson';

function transformOrder(row) {
  let items = [];
  try { items = JSON.parse(row.itemsJson ?? '[]'); } catch { items = []; }
  return { ...row, items };
}

function preWarm(orders) {
  orders.forEach((order) => lsSet(cacheKey('ordersView', order.orderId), [order]));
  return orders;
}

/**
 * Fetch all orders for a customer from OrdersView, sorted newest first.
 * Also pre-warms individual order caches so tapping a card is instant.
 */
export async function getOrdersByCustomerId(customerId, onRevalidate) {
  const rows = await gvizSwrFetch(
    'ordersView',
    `SELECT * WHERE B='${gvizStr(customerId)}' ORDER BY D DESC`,
    customerId,
    transformOrder,
    onRevalidate ? (rows) => onRevalidate(preWarm(rows)) : null,
    ORDERS_VIEW_COLS,
  );
  return preWarm(rows);
}

/**
 * Fetch a single order by orderId.
 * Typically served from cache pre-warmed by getOrdersByCustomerId.
 */
export async function getOrderById(orderId, onRevalidate) {
  const rows = await gvizSwrFetch(
    'ordersView',
    `SELECT * WHERE A='${gvizStr(orderId)}' LIMIT 1`,
    orderId,
    transformOrder,
    onRevalidate ? (rows) => onRevalidate(rows[0] ?? null) : null,
    ORDERS_VIEW_COLS,
  );
  return rows[0] ?? null;
}
