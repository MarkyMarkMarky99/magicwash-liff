const ORDER_API_URL =
  'https://script.google.com/macros/s/AKfycbzCGcGxe45YoGlwc82kCqbP63ODuhMQ6fNh9Dro2bY4p57FBPRx2dUCtb5GEfuPquXZ/exec';

export async function getOrderById(orderId) {
  const url = `${ORDER_API_URL}?orderId=${encodeURIComponent(orderId)}`;
  console.log('[orderApi] fetching:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  console.log('[orderApi] response:', json);
  return json;
}
