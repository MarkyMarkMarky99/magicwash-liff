import { useState } from 'react';
import OrderCard from './OrderCard';

export default function OrderList({ orders, onViewPhotos, onSelectOrder }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="bg-white w-full">

      {/* Section heading — CardContainer style */}
      <div
        className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[16px]">receipt_long</span>
          <h2 className="font-headline font-bold text-[13px] tracking-tight">ประวัติออเดอร์</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-container rounded-full px-2.5 py-1">
            <span className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
              {orders.length} orders
            </span>
          </div>
          <span className={`material-symbols-outlined text-primary text-[16px] transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* Empty */}
      {!collapsed && orders.length === 0 && (
        <p className="px-6 py-4 text-sm text-on-surface-variant italic">ยังไม่มีออเดอร์</p>
      )}

      {/* Cards */}
      {!collapsed && orders.length > 0 && (
        <div className="divide-y divide-outline-variant/10">
          {orders.map((order) => (
            <OrderCard key={order.orderId} order={order} onViewPhotos={onViewPhotos} onSelectOrder={onSelectOrder} />
          ))}
        </div>
      )}

    </section>
  );
}
