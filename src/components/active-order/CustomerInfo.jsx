import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../../api/dateUtils';

export default function CustomerInfo({ customer, paid, delivery, onSchedule }) {
  const { t } = useTranslation();
  const [showPayHint, setShowPayHint] = useState(false);

  if (!customer) return null;

  const displayName = customer.customerName
    || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  const address = customer.address || '';

  const handleDeliveryClick = () => {
    if (paid) {
      onSchedule();
    } else {
      setShowPayHint(true);
      setTimeout(() => setShowPayHint(false), 3000);
    }
  };

  return (
    <section className="relative border border-outline-variant/40 rounded-2xl px-4 pt-6 pb-4">
      <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">
        {t('activeOrder.customer.details')}
      </p>

      {/* Customer details */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 overflow-hidden">
          <span className="material-symbols-outlined fill-icon text-[44px] text-outline-variant translate-y-1">
            account_circle
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-headline font-bold text-[15px] text-primary leading-tight truncate">
            {displayName || '–'}
          </h3>
          {customer.phone && (
            <div className="flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>call</span>
              <p className="font-body text-[11px] text-on-surface-variant">{customer.phone}</p>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-1 mt-0.5">
              <span className="material-symbols-outlined text-on-surface-variant mt-px" style={{ fontSize: '13px' }}>location_on</span>
              <p className="font-body text-[11px] text-on-surface-variant leading-snug line-clamp-2">
                {address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery scheduling */}
      <div className="mt-3 pt-3 border-t border-outline-variant/25">
        {delivery ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[15px] leading-none">event_available</span>
            </div>
            <div>
              <p className="font-body text-[11px] text-on-surface-variant">{t('activeOrder.delivery.scheduled')}</p>
              <p className="font-headline font-bold text-[12px] text-primary mt-0.5">
                {formatDisplayDate(delivery.appointmentDate)} · {delivery.timeSlot}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleDeliveryClick}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-headline font-bold text-[13px] transition-all ${
                paid
                  ? 'bg-primary/10 text-primary hover:bg-primary/15 active:scale-[0.98]'
                  : 'bg-surface-container text-outline'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">
                {paid ? 'event' : 'lock'}
              </span>
              {t('activeOrder.delivery.schedule')}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${showPayHint ? 'max-h-8 mt-1.5 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-center font-body text-[11px] text-on-surface-variant">
                {t('activeOrder.delivery.locked')}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
