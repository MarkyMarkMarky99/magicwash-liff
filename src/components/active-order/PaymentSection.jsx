import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../../api/dateUtils';
import { calculateCost } from './CostSummary';

function formatBaht(n) {
  return `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentSection({ order, onPay, discountAmount = 0, serviceMultiplier = 1 }) {
  const { t } = useTranslation();
  const paid = order?.paymentStatus === 'PAID';
  const { total } = calculateCost(order?.items ?? [], 0.07, discountAmount, serviceMultiplier);

  if (paid) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-green-50 border border-green-200">
        <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px] leading-none">check</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-[13px] text-green-800 leading-tight">
            {t('activeOrder.payment.paid')}
          </p>
          {order?.paidAt && (
            <p className="font-body text-[11px] text-green-700 mt-0.5">
              {t('activeOrder.payment.paidOn')} {formatDisplayDate(order.paidAt)}
            </p>
          )}
        </div>
        <span className="font-headline font-bold text-[14px] text-green-800 shrink-0">
          {formatBaht(total)}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onPay}
      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-primary text-on-primary shadow-md active:scale-[0.98] hover:opacity-95 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[22px] leading-none">payments</span>
        <span className="font-headline font-bold text-[15px]">{t('activeOrder.payment.payNow')}</span>
      </div>
      <span className="font-headline font-bold text-[16px]">{formatBaht(total)}</span>
    </button>
  );
}
