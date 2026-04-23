import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const TIME_SLOTS = ['10:00-12:00', '13:00-15:00', '15:00-17:00', '18:00-20:00'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNext14Days() {
  const result = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push({ d, ds: toDateStr(d) });
  }
  return result;
}

function isSlotDisabled(slot, selectedDate) {
  const todayStr = toDateStr(new Date());
  if (selectedDate !== todayStr) return false;
  const [startStr] = slot.split('-');
  const [h, m] = startStr.split(':').map(Number);
  const slotStart = new Date();
  slotStart.setHours(h, m, 0, 0);
  return new Date() >= slotStart;
}

export default function BookingForm({ selectedDate, selectedTime, notes, onDateChange, onTimeChange, onNotesChange, onSubmit, disabled, onValidChange }) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (selectedTime && isSlotDisabled(selectedTime, selectedDate)) onTimeChange(null);
  }, [selectedDate]);

  useEffect(() => {
    onValidChange?.(!!(selectedDate && selectedTime && !isSlotDisabled(selectedTime, selectedDate)));
  }, [selectedDate, selectedTime]);
  const dateLocale = i18n.language === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';

  const dates = getNext14Days();

  const monthLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })
    : '';

  return (
    <form id="booking-form" onSubmit={onSubmit} className="space-y-5">

      {/* Date strip */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline font-bold text-base text-primary">{t('booking.availableDates')}</h2>
          <div className="flex items-center gap-1.5 bg-surface-container rounded-full px-3 py-1">
            <span className="material-symbols-outlined text-primary text-sm" aria-hidden="true">calendar_month</span>
            <span className="font-label text-xs text-on-surface-variant font-semibold">{monthLabel}</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-2 px-2 py-2">
          {dates.map(({ d, ds }) => {
            const isTuesday = d.getDay() === 2;
            const selected = ds === selectedDate;
            return (
              <button
                key={ds}
                type="button"
                disabled={disabled || isTuesday}
                onClick={() => onDateChange(ds)}
                className={`flex-shrink-0 flex flex-col items-center justify-center rounded-full w-[52px] h-[52px] transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                  isTuesday
                    ? 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
                    : selected
                    ? 'bg-primary text-on-primary shadow-md active:scale-[0.98]'
                    : 'bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                <span className={`font-label text-[9px] uppercase font-semibold leading-none mb-0.5 ${selected ? 'opacity-80' : 'text-on-surface-variant'}`}>
                  {t('days', { returnObjects: true })[d.getDay()]}
                </span>
                <span className={`font-headline font-bold text-sm leading-none ${selected ? '' : 'text-on-surface'}`}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Time slots */}
      <section className="space-y-3">
        <h2 className="font-headline font-bold text-base text-primary">{t('booking.availableTimeslots')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {TIME_SLOTS.map((slot) => {
            const past = isSlotDisabled(slot, selectedDate);
            const selected = slot === selectedTime;
            return (
              <button
                key={slot}
                type="button"
                disabled={disabled || past}
                onClick={() => onTimeChange(slot)}
                className={`rounded-lg font-body py-2 px-3 text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary ${
                  past
                    ? 'border border-outline-variant/20 bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
                    : selected
                    ? 'border-[1.5px] border-primary bg-primary text-on-primary font-semibold shadow-sm'
                    : 'border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className={`material-symbols-outlined text-[14px] ${past ? 'opacity-40' : selected ? 'opacity-80' : 'text-on-surface-variant'}`}>schedule</span>
                <span className={selected ? '' : 'font-medium'}>{slot}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <label className="font-headline font-bold text-base text-primary block">
          {t('booking.notes')} <span className="font-normal text-on-surface-variant text-sm">{t('booking.optional')}</span>
        </label>
        <div className="relative group">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={disabled}
            className="w-full h-28 p-4 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest font-body text-sm text-on-surface placeholder:text-on-surface-variant/60 resize-none transition-colors outline-none disabled:opacity-50"
            placeholder={t('booking.notesPlaceholder')}
          />
          {!notes && (
            <div className="absolute bottom-3 right-3 pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-[20px]" aria-hidden="true">edit_note</span>
            </div>
          )}
        </div>
      </section>

    </form>
  );
}
