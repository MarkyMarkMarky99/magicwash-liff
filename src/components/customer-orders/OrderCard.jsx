const STATUS_CONFIG = {
  // Real statuses from OrderForm sheet
  'SUBMITTED': { icon: 'local_laundry_service', badge: 'bg-surface-container text-on-surface-variant',     avatar: 'bg-surface-container text-on-surface-variant'     },
  'CONFIRM':   { icon: 'check_circle',          badge: 'bg-primary-container text-on-primary-container',   avatar: 'bg-primary-container text-on-primary-container'   },
  // Backward-compatible Thai labels (mock data)
  'เสร็จแล้ว': { icon: 'check_circle',         badge: 'bg-primary-container text-on-primary-container',   avatar: 'bg-primary-container text-on-primary-container'   },
  'กำลังซัก':  { icon: 'local_laundry_service', badge: 'bg-secondary-container text-on-secondary-container', avatar: 'bg-secondary-container text-on-secondary-container' },
  'รับแล้ว':   { icon: 'inventory_2',           badge: 'bg-secondary-container text-on-secondary-container', avatar: 'bg-secondary-container text-on-secondary-container' },
};

import { formatDisplayDate } from '../../api/dateUtils';

export default function OrderCard({ order, onViewPhotos, onSelectOrder }) {
  const cfg = STATUS_CONFIG[order.status] ?? {
    icon: 'receipt_long',
    badge: 'bg-surface-container text-on-surface-variant',
    avatar: 'bg-surface-container text-on-surface-variant',
  };

  return (
    <div
      className="px-4 py-3 flex gap-3 cursor-pointer hover:bg-surface-container-low active:bg-surface-container transition-colors"
      onClick={() => onSelectOrder?.(order.orderId)}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-outline-variant/10 ${cfg.avatar}`}>
        <span className="material-symbols-outlined fill-icon text-[20px]">{cfg.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0 flex flex-col justify-center">
        {/* Row 1: date + badge + quantity */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-headline font-bold text-primary text-[14px] leading-tight truncate">
              {formatDisplayDate(order.date, { day: '2-digit', month: 'short', year: 'numeric' })}
            </h3>
            <span className={`inline-flex items-center px-1.5 py-px rounded-full font-label text-[9px] font-bold uppercase tracking-wide shrink-0 ${cfg.badge}`}>
              {order.status}
            </span>
          </div>
          <span className="font-body text-[11px] font-semibold text-on-surface-variant shrink-0">
            {order.quantity != null ? `${order.quantity} ชิ้น` : ''}
          </span>
        </div>

        {/* Row 2: notes / serviceType + photo icon */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-body text-xs text-on-surface-variant truncate">
            {order.notes || order.serviceType || ''}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onViewPhotos?.(order.orderId); }}
            className="shrink-0 text-primary hover:opacity-70 active:scale-[0.98] transition-all focus:outline-none"
          >
            <span className="material-symbols-outlined text-[14px]">photo_library</span>
          </button>
        </div>
      </div>
    </div>
  );
}
