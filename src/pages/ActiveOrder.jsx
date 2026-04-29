import { useState } from 'react';
import OrderInfoCard from '../components/active-order/OrderInfoCard';
import CustomerInfo from '../components/active-order/CustomerInfo';
import ItemsList from '../components/active-order/ItemsList';
import CostSummary, { calculateCost, SERVICE_TYPES } from '../components/active-order/CostSummary';
import PaymentSection from '../components/active-order/PaymentSection';

const MOCK_VOUCHERS = {
  'WASH10': { type: 'percent', value: 10 },
  'FLAT50': { type: 'fixed', value: 50 },
};

export default function ActiveOrder({ customer, order, pickupAppointment, deliveryAppointment }) {
  const [optimisticOrder, setOptimisticOrder] = useState(order);
  const [voucher, setVoucher] = useState(null); // { code, discountAmount }
  const [serviceType, setServiceType] = useState('saver');

  const handlePay = () => {
    setOptimisticOrder({
      ...optimisticOrder,
      paymentStatus: 'PAID',
      paidAt: new Date().toISOString(),
    });
  };

  const handleScheduleDelivery = () => {
    // Later: navigate to delivery booking screen
    alert('Schedule delivery flow — to be built');
  };

  const handleServiceTypeChange = (id) => {
    setServiceType(id);
    setVoucher(null); // reset voucher when tier changes
  };

  const handleApplyVoucher = (code) => {
    const mock = MOCK_VOUCHERS[code];
    if (!mock) return false;
    const multiplier = SERVICE_TYPES.find(s => s.id === serviceType)?.multiplier ?? 1;
    const { subtotal } = calculateCost(optimisticOrder?.items ?? [], 0.07, 0, multiplier);
    const discountAmount = mock.type === 'percent'
      ? Math.round(subtotal * mock.value / 100 * 100) / 100
      : mock.value;
    setVoucher({ code, discountAmount });
    return true;
  };

  const handleRemoveVoucher = () => setVoucher(null);

  const paid = optimisticOrder?.paymentStatus === 'PAID';
  const discountAmount = voucher?.discountAmount ?? 0;
  const serviceMultiplier = SERVICE_TYPES.find(s => s.id === serviceType)?.multiplier ?? 1;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 pt-4 pb-24 space-y-5">
          <OrderInfoCard
            order={optimisticOrder}
            pickupAppointment={pickupAppointment}
            deliveryAppointment={deliveryAppointment}
          />
          <CustomerInfo
            customer={customer}
            paid={paid}
            delivery={deliveryAppointment}
            onSchedule={handleScheduleDelivery}
          />
          <ItemsList items={optimisticOrder?.items} />
          <CostSummary
            items={optimisticOrder?.items}
            voucher={voucher}
            onApplyVoucher={handleApplyVoucher}
            onRemoveVoucher={handleRemoveVoucher}
            serviceType={serviceType}
            onServiceTypeChange={handleServiceTypeChange}
          />
        </div>
      </main>

      <footer className="flex-none px-4 pt-3 pb-4 bg-surface border-t border-outline-variant/20 z-40">
        <PaymentSection order={optimisticOrder} onPay={handlePay} discountAmount={discountAmount} serviceMultiplier={serviceMultiplier} />
      </footer>
    </div>
  );
}
