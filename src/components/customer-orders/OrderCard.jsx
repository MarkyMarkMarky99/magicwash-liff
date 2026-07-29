const STATUS_CONFIG = {
  // Real statuses from OrdersView sheet
  'SUBMITTED': { icon: 'local_laundry_service', badge: 'bg-amber-100 text-amber-700', avatar: 'bg-amber-50 text-amber-600' },
  'PENDING':   { icon: 'schedule',              badge: 'bg-amber-100 text-amber-700', avatar: 'bg-amber-50 text-amber-600' },
  'APPROVED':  { icon: 'task_alt',              badge: 'bg-blue-100 text-blue-700',   avatar: 'bg-blue-50 text-blue-700'   },
  'CONFIRM':   { icon: 'check_circle',          badge: 'bg-green-100 text-green-700', avatar: 'bg-green-50 text-green-700' },
  'RECEIVED':  { icon: 'inventory_2',           badge: 'bg-teal-50 text-teal-700',    avatar: 'bg-teal-50 text-teal-700'   },
  'COMPLETED': { icon: 'done_all',              badge: 'bg-green-100 text-green-700', avatar: 'bg-green-50 text-green-700' },
  // Backward-compatible Thai labels (mock data)
  'เสร็จแล้ว': { icon: 'check_circle',         badge: 'bg-green-100 text-green-700',  avatar: 'bg-green-50 text-green-700'  },
  'กำลังซัก':  { icon: 'local_laundry_service', badge: 'bg-amber-100 text-amber-700',  avatar: 'bg-amber-50 text-amber-600'  },
  'รับแล้ว':   { icon: 'inventory_2',           badge: 'bg-teal-50 text-teal-700',     avatar: 'bg-teal-50 text-teal-700'    },
};

// Payment status uses the app's real MD3 text tokens (not the order-status
// Tailwind palette above) so the two status systems stay visually distinct.
const PAYMENT_STATUS_TEXT = {
  'PAID':           'text-primary',
  'PARTIALLY_PAID': 'text-on-secondary-container',
  'UNPAID':         'text-on-error-container',
  'OVERDUE':        'text-on-error-container',
  'CANCELLED':      'text-on-surface-variant',
  'VOID':           'text-on-surface-variant',
};

import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';

function formatBaht(n) {
  return `฿${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderCard({ order, onViewPhotos, onSelectOrder, onViewInvoice, onPayNow }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const hasInvoice = Boolean(order.invoiceNumber);
  const hasPaymentStatus = hasInvoice && Boolean(order.paymentStatus);
  const balanceDue = Number(order.balanceDue ?? 0);
  const cfg = STATUS_CONFIG[order.status] ?? {
    icon: 'receipt_long',
    badge: 'bg-gray-100 text-gray-600',
    avatar: 'bg-gray-100 text-gray-500',
  };

  return (
    <div
      className="px-4 py-3 cursor-pointer hover:bg-surface-container-low active:bg-surface-container transition-colors"
      onClick={() => onSelectOrder?.(order.orderId)}
    >
      {/* Content */}
      <div className="min-w-0 flex flex-col justify-center gap-0.5">
        {/* Row 1: date + status badge, icon actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-3 h-3 rounded-[2px] flex items-center justify-center shrink-0 ${cfg.avatar}`}>
              <span className="material-symbols-outlined fill-icon text-[9px]" aria-hidden="true">{cfg.icon}</span>
            </div>
            <h3 className="font-headline font-bold text-primary text-[14px] leading-tight truncate">
              {formatDisplayDate(order.receivedDate, { day: '2-digit', month: 'short', year: 'numeric' }, dateLocale)}
            </h3>
            <span className={`inline-flex items-center px-1.5 py-px rounded-full font-label text-[9px] font-bold uppercase tracking-wide shrink-0 ${cfg.badge}`}>
              {order.status}
            </span>
          </div>
          <div
            className="flex items-center gap-2.5 shrink-0"
            onClick={(event) => event.stopPropagation()}
          >
            {hasInvoice && (
              <button
                type="button"
                onClick={() => onViewInvoice?.(order.invoiceNumber)}
                aria-label={t('customerOrders.viewInvoice')}
                className="text-primary hover:opacity-70 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">receipt_long</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onViewPhotos?.(order.orderId)}
              aria-label={t('customerOrders.viewPhotos')}
              className="text-primary hover:opacity-70 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">photo_library</span>
            </button>
          </div>
        </div>

        {/* Row 2: note */}
        {order.note && (
          <p className="py-0.5 font-body text-xs text-on-surface-variant truncate">
            {order.note}
          </p>
        )}

        {/* Row 3: payment status and amount (only when the order has an invoice) */}
        {hasPaymentStatus && (
          <div className="flex items-center justify-between gap-2 mt-0.5 pt-1.5 border-t border-outline-variant/20">
            <div className="flex flex-col items-start leading-tight min-w-0">
              <span className={`font-label text-[9px] font-bold uppercase tracking-wide truncate ${PAYMENT_STATUS_TEXT[order.paymentStatus] ?? 'text-on-surface-variant'}`}>
                {t(`invoice.status.${order.paymentStatus}`, { defaultValue: order.paymentStatus })}
              </span>
              {order.paymentStatus === 'PARTIALLY_PAID' && order.grandTotal != null && (
                <span className="font-label text-[9px] font-bold uppercase tracking-wide text-on-surface-variant truncate">
                  {t('customerOrders.balanceOf', { amount: formatBaht(order.grandTotal) })}
                </span>
              )}
              <span className="font-headline font-extrabold text-[13px] text-on-surface truncate">
                {formatBaht(balanceDue > 0 ? balanceDue : (order.grandTotal ?? 0))}
              </span>
            </div>
            {balanceDue > 0 && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onPayNow?.(order.invoiceNumber, order.orderId); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-on-primary font-headline text-[11px] font-bold hover:opacity-95 active:scale-[0.98] transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">payments</span>
                {t('invoice.pay.action')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
