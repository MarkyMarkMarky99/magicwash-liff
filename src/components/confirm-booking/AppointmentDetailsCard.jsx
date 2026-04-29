import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';

export default function AppointmentDetailsCard({ name, phone, date, timeSlot, notes }) {
  const { t, i18n } = useTranslation();
  const displayDate = formatDisplayDate(
    date,
    { day: 'numeric', month: 'short' },
    getDateLocale(i18n.language),
  );

  return (
    <div>
      {/* Section header row */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
          {t('confirmBooking.appointmentDetails')}
        </p>
        {(date || timeSlot) && (
          <div className="flex items-center gap-1 bg-[#eaf9f7] rounded-full px-2 py-0.5">
            <span className="material-symbols-outlined text-[#0cd9c3] text-[11px] leading-none">calendar_today</span>
            <span className="text-[10px] font-semibold text-[#0cd9c3] leading-none">
              {[displayDate, timeSlot].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50/50">
        {/* Customer info */}
        <div className={`flex items-center ${notes ? 'mb-4' : ''}`}>
          <div className="w-14 h-14 rounded-[14px] bg-surface-container-highest flex items-center justify-center mr-4 shadow-sm overflow-hidden flex-shrink-0">
            <span className="material-symbols-outlined fill-icon text-outline-variant text-[56px] translate-y-1">account_circle</span>
          </div>
          <div className="min-w-0">
            <p className="font-headline font-bold text-[17px] text-[#2d3648] leading-tight truncate">{name || '—'}</p>
            {phone && <p className="font-body text-sm text-gray-500 mt-0.5">{phone}</p>}
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="bg-[#f8f9fb] rounded-xl p-3">
            <p className="text-[11px] text-gray-400 font-medium mb-0.5">{t('confirmBooking.notes')}</p>
            <p className="font-body text-sm text-[#2d3648] leading-snug">{notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
