import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';

/**
 * A read-only "waiting for pickup" row shown in the order history list.
 * Sourced from the Appointments sheet (not OrdersView), so it is NOT clickable
 * and has no photos — tapping would try to open an order that does not exist.
 */
export default function WaitingPickupCard({ appointment }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  return (
    <div className="px-4 py-3">
      {/* Content */}
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
              <span className="material-symbols-outlined fill-icon text-[12px]" aria-hidden="true">local_shipping</span>
            </div>
            <h3 className="font-headline font-bold text-primary text-[14px] leading-tight truncate">
              {formatDisplayDate(appointment.appointmentDate, { day: '2-digit', month: 'short', year: 'numeric' }, dateLocale)}
            </h3>
            <span className="inline-flex items-center px-1.5 py-px rounded-full font-label text-[9px] font-bold uppercase tracking-wide shrink-0 bg-amber-100 text-amber-700">
              {t('waitingPickup.badge')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-on-surface-variant text-[13px]" aria-hidden="true">schedule</span>
          <p className="font-body text-xs text-on-surface-variant truncate">
            {appointment.timeSlot || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
