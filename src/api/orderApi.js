import { gvizSwrFetch, cacheKey, lsSet } from './localCache';

const ORDERS_VIEW_COLS = 'orderId,customerId,orderNumber,invoiceNumber,receivedDate,dueDate,serviceType,status,quantity,note,itemsJson';

function transformOrder(row) {
  let items = [];
  try { items = JSON.parse(row.itemsJson ?? '[]'); } catch { items = []; }
  const invoiceNumber = typeof row.invoiceNumber === 'string'
    ? row.invoiceNumber.trim() || null
    : null;
  return { ...row, invoiceNumber, items };
}

function preWarm(orders) {
  orders.forEach((order) => lsSet(cacheKey('ordersViewV3', order.orderId), [order]));
  return orders;
}

/**
 * Fetch all orders for a customer from OrdersView, sorted newest first.
 * Also pre-warms individual order caches so tapping a card is instant.
 */
export async function getOrdersByCustomerId(customerId, onRevalidate) {
  const rows = await gvizSwrFetch(
    'ordersView',
    { filterField: 'customerId', filterValue: customerId, sortField: 'receivedDate', sortDir: 'desc' },
    customerId,
    transformOrder,
    onRevalidate ? (rows) => onRevalidate(preWarm(rows)) : null,
    ORDERS_VIEW_COLS,
    'ordersViewV3',
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
    { filterField: 'orderId', filterValue: orderId, limit: 1 },
    orderId,
    transformOrder,
    onRevalidate ? (rows) => onRevalidate(rows[0] ?? null) : null,
    ORDERS_VIEW_COLS,
    'ordersViewV3',
  );
  return rows[0] ?? null;
}
