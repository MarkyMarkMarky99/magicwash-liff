import { useTranslation } from 'react-i18next';
import SectionCard from '../ui/SectionCard';
import OrderCard from './OrderCard';
import WaitingPickupCard from './WaitingPickupCard';

export default function OrderList({ orders, waitingPickups = [], onViewPhotos, onSelectOrder, onViewInvoice, onPayNow, onRefresh, refreshing = false }) {
  const { t } = useTranslation();
  const isEmpty = orders.length === 0 && waitingPickups.length === 0;

  return (
    <SectionCard
      icon="receipt_long"
      title={t('customerOrders.orderHistory')}
      badge={t('customerOrders.ordersCount', { count: orders.length })}
      action={
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
          disabled={refreshing}
          aria-label={t('customerOrders.refresh')}
          className="h-[22px] w-[22px] flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span
            className={`material-symbols-outlined text-primary text-[16px] ${refreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          >
            refresh
          </span>
        </button>
      }
    >
      {isEmpty ? (
        <p className="px-6 py-4 text-sm text-on-surface-variant italic">{t('customerOrders.empty')}</p>
      ) : (
        <div className="divide-y divide-outline-variant/10">
          {waitingPickups.map((appt) => (
            <WaitingPickupCard key={appt.appointmentId} appointment={appt} />
          ))}
          {orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onViewPhotos={onViewPhotos}
              onSelectOrder={onSelectOrder}
              onViewInvoice={onViewInvoice}
              onPayNow={onPayNow}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
