import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';
import { currentStepIndex, STATUS_KEYS } from './orderStatus';

function DateChip({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">
        {label}
      </p>
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary">
        {value}
      </span>
    </div>
  );
}

export default function OrderInfoCard({ order, pickupAppointment, deliveryAppointment }) {
  const { t, i18n } = useTranslation();
  if (!order) return null;

  const dateLocale = getDateLocale(i18n.language);
  const activeIdx = currentStepIndex({
    pickup: pickupAppointment,
    order,
    delivery: deliveryAppointment,
  });

  return (
    <section className="space-y-4">
      {/* Top: Order number + issued/due date chips */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest mb-0.5">
            {t('activeOrder.orderNumber')}
          </p>
          <h2 className="font-headline font-bold text-[22px] text-on-surface leading-tight truncate">
            {order.orderId}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
          <DateChip label={t('activeOrder.issuedDate')} value={formatDisplayDate(order.receivedDate, undefined, dateLocale)} />
          <DateChip label={t('activeOrder.dueDate')} value={formatDisplayDate(order.dueDate, undefined, dateLocale)} />
        </div>
      </div>

      {/* Segmented status bar — 5 steps */}
      <div className="grid grid-cols-5 gap-x-0.5 gap-y-1.5">
        {STATUS_KEYS.map((key, i) => {
          const state = i < activeIdx ? 'done' : i === activeIdx ? 'current' : 'pending';
          const labelClass =
            state === 'current' ? 'font-bold text-on-surface' :
              state === 'done' ? 'text-on-surface-variant' :
                'text-outline';
          const fillClass =
            state === 'done' ? 'w-full bg-primary' :
              state === 'current' ? 'w-1/2 bg-primary' :
                'w-0 bg-primary';
          const radiusClass =
            i === 0 ? 'rounded-l-full' :
              i === STATUS_KEYS.length - 1 ? 'rounded-r-full' :
                'rounded-none';
          return (
            <div key={key} className="flex flex-col gap-1.5 min-w-0">
              <p className={`font-body text-[10px] leading-tight text-center ${labelClass}`}>
                {t(`activeOrder.tracker.${key}`)}
              </p>
              <div className={`w-full h-1.5 bg-surface-container overflow-hidden ${radiusClass}`}>
                <div className={`h-full transition-all rounded-none ${fillClass}`} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
