import { useTranslation } from 'react-i18next';

const ROW = ({ label, value }) => (
  <div className="flex gap-3">
    <span className="w-24 shrink-0 font-body font-semibold text-base text-on-surface-variant whitespace-nowrap">{label}</span>
    <span className="font-body text-base text-on-surface break-all">{value || '—'}</span>
  </div>
);

function formatDate(dateStr, locale) {
  if (!dateStr) return { day: '—', month: '', weekday: '' };
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString(locale, { weekday: 'short' }).replace(/\./g, ''),
    day:     d.toLocaleDateString(locale, { day: 'numeric' }),
    month:   d.toLocaleDateString(locale, { month: 'short' }).replace(/\./g, ''),
  };
}

export default function BookingSuccessView({ registeredData = {}, date, timeSlot }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'th' ? 'th-TH-u-ca-gregory' : 'en-US';
  const { weekday, day, month } = formatDate(date, dateLocale);
  const fullName = [registeredData.firstName, registeredData.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div className="flex flex-col gap-4">

      <div className="flex items-center gap-4">
        <div className="size-24 rounded-[20px] bg-primary flex flex-col items-center justify-center shrink-0 shadow-md shadow-primary/10">
          <span className="type-overline text-on-primary/80 mb-1">{weekday}</span>
          <span className="type-display text-on-primary">{day}</span>
          <span className="type-overline text-on-primary/80 mt-1">{month}</span>
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <span className="type-overline text-on-surface-variant/60 mb-1.5">{t('bookingSuccess.appointment')}</span>
          <span className="type-display text-on-surface mb-2">{timeSlot || '—'}</span>
          <div className="flex items-center gap-1.5 text-on-surface-variant/60">
            <span className="material-symbols-outlined text-[13px] shrink-0">schedule</span>
            <span className="font-body text-[13px] font-medium">{t('bookingSuccess.pickupWindow')}</span>
          </div>
        </div>
      </div>

      <div className="card flex flex-col gap-2.5">
        <p className="type-overline text-on-surface-variant/50 mb-0.5">{t('bookingSuccess.summary')}</p>
        <ROW label={t('labels.name')}    value={fullName} />
        <ROW label={t('labels.phone')}   value={registeredData.phone} />
        <ROW label={t('labels.address')} value={registeredData.address} />
      </div>

    </div>
  );
}
