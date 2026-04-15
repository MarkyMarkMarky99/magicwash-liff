import CardSection from '../ui/CardSection';
import OrderCard from './OrderCard';

export default function OrderList({ orders, onViewPhotos, onSelectOrder, onRefresh, refreshing = false, onViewAll }) {
  return (
    <CardSection
      title="ประวัติออเดอร์"
      icon="receipt_long"
      count={orders.length}
      onRefresh={onRefresh}
      refreshing={refreshing}
      emptyText="ยังไม่มีออเดอร์"
      limit={5}
      onViewAll={onViewAll}
    >
      {orders.map((order) => (
        <OrderCard key={order.orderId} order={order} onViewPhotos={onViewPhotos} onSelectOrder={onSelectOrder} />
      ))}
    </CardSection>
  );
}
