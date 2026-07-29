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

export function mergeOrdersWithInvoices(orders, invoices) {
  if (!invoices.length) return orders;
  const byInvoiceNumber = new Map(invoices.map((inv) => [inv.invoiceNumber, inv]));
  return orders.map((order) => {
    if (!order.invoiceNumber) return order;
    const invoice = byInvoiceNumber.get(order.invoiceNumber);
    if (!invoice) return order;
    return {
      ...order,
      paymentStatus: invoice.status,
      balanceDue: invoice.balanceDue,
      grandTotal: invoice.grandTotal,
    };
  });
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
    { filterField: 'customerId', filterValue: customerId, sortField: 'receivedDate', sortDir: 'desc' },
    customerId,
    transformOrder,
    onRevalidate ? (rows) => onRevalidate(preWarm(rows)) : null,
    ORDERS_VIEW_COLS,
    'ordersView',
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
    'ordersView',
  );
  return rows[0] ?? null;
}
