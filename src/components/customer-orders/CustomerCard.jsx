import { useTranslation } from 'react-i18next';

export default function CustomerCard({ customer, onSchedule }) {
  const { t } = useTranslation();

  if (!customer) return null;

  const displayName = customer.customerName
    || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  const address = customer.address || '';

  return (
    <section className="relative border border-outline-variant/40 rounded-2xl px-4 pt-6 pb-4">
      <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">
        {t('activeOrder.customer.details')}
      </p>

      <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>call</span>
              <p className="font-body text-[11px] text-on-surface-variant">{customer.phone}</p>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-1 mt-0">
              <span className="material-symbols-outlined text-on-surface-variant mt-px" style={{ fontSize: '13px' }}>location_on</span>
              <p className="font-body text-[11px] text-on-surface-variant truncate">
                {address}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-outline-variant/25">
        <button
          onClick={onSchedule}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-headline font-bold text-[13px] transition-all bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px] leading-none">event</span>
          {t('customerOrders.schedulePickup')}
        </button>
      </div>
    </section>
  );
}
