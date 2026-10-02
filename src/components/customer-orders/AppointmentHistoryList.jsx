import { useTranslation } from 'react-i18next';
import SectionCard from '../ui/SectionCard';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';

const STATUS_STYLES = {
  PENDING: 'bg-surface-container text-on-surface-variant',
  CONFIRMED: 'bg-primary/10 text-primary',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-error-container text-on-error-container',
  NO_SHOW: 'bg-error-container text-on-error-container',
};

export default function AppointmentHistoryList({ appointments, status, onRefresh }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const refreshing = status === 'loading' || status === 'refreshing';

  return (
    <SectionCard
      icon="event"
      title={t('customerOrders.appointmentHistory')}
      action={
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={t('customerOrders.refreshAppointments')}
          className="h-[22px] w-[22px] flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className={`material-symbols-outlined text-primary text-[16px] ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true">refresh</span>
        </button>
      }
    >
      {status === 'loading' && appointments.length === 0 && (
        <p className="px-4 py-4 text-sm text-on-surface-variant" role="status">{t('loading')}</p>
      )}
      {status === 'error' && (
        <div className="px-4 py-4 space-y-2">
          <p className="text-sm text-error" role="alert">{t('customerOrders.appointmentsLoadError')}</p>
          <button type="button" onClick={onRefresh} className="rounded text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary">
            {t('invoice.retry')}
          </button>
        </div>
      )}
      {status === 'done' && appointments.length === 0 && (
        <p className="px-4 py-4 text-sm text-on-surface-variant">{t('customerOrders.noAppointments')}</p>
      )}
      {appointments.length > 0 && (
        <ul className="divide-y divide-outline-variant/10">
          {appointments.map((appointment) => (
            <li key={appointment.appointmentId} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-headline font-bold text-primary text-[14px] leading-tight">
                  {formatDisplayDate(appointment.appointmentDate, { day: '2-digit', month: 'short', year: 'numeric' }, dateLocale)}
                </h3>
                <span className={`inline-flex px-1.5 py-px rounded-full font-label text-[9px] font-bold uppercase tracking-wide ${STATUS_STYLES[appointment.status] ?? STATUS_STYLES.PENDING}`}>
                  {t(`customerOrders.appointmentStatuses.${appointment.status}`, { defaultValue: appointment.status || '—' })}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 mt-1 text-xs text-on-surface-variant">
                <span>{t(`customerOrders.appointmentTypes.${appointment.appointmentType}`, { defaultValue: appointment.appointmentType || '—' })}</span>
                <span className="inline-flex items-center gap-1 text-right">
                  <span className="material-symbols-outlined text-[12px] shrink-0" aria-hidden="true">schedule</span>
                  {appointment.timeSlot || '—'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}