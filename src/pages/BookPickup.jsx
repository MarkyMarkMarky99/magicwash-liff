import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createAppointment } from '../api/customerApi';
import PageLayout from '../components/layout/PageLayout';
import BookingSuccessModal from '../components/booking/BookingSuccessModal';
const TIME_SLOTS = ['10:00-12:00', '13:00-15:00', '15:00-17:00', '18:00-20:00'];

function toDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getNext14Days() {
  const result = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push({ d, ds: toDateStr(d) });
  }
  return result;
}

export default function BookPickup({ userData }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateStr(d);
  })();

  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  const dates = getNext14Days();
  const canConfirm = selectedDate && selectedTime;

  const formattedDate = (() => {
    if (!selectedDate) return '—';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const monthLabel = (() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' });
  })();

  const displayName = userData?.customerName
    || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();
  const displayAddress = (userData?.address || '').split(',')[0].trim();

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsBooking(true);
    setBookingError(null);
    try {
      const res = await createAppointment({
        customerId:      userData?.customerId || userData?.uuid || '',
        appointmentDate: selectedDate,
        timeSlot:        selectedTime,
        address:         userData?.address || '',
        notes,
      });
      if (res.status === 'success') {
        setSuccess(true);
      } else {
        setBookingError(res.message || 'Booking failed');
      }
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setIsBooking(false);
    }
  };

  const footer = (
    <>
      {bookingError && (
        <div className="px-1 flex items-start gap-2 mb-2">
          <span className="material-symbols-outlined text-error text-[16px] mt-0.5 flex-shrink-0">error</span>
          <p className="text-error text-xs font-body">{bookingError}</p>
        </div>
      )}
      <button
        disabled={!canConfirm || isBooking}
        onClick={handleConfirm}
        className={`w-full font-headline font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all ${
          canConfirm && !isBooking
            ? 'bg-primary hover:brightness-110 text-on-primary shadow-[0_4px_12px_rgba(0,79,69,0.2)] active:scale-[0.98]'
            : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
        }`}
      >
        {isBooking ? (
          <>
            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
            {t('booking.booking')}
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">local_laundry_service</span>
            {t('booking.confirm')}
          </>
        )}
      </button>
    </>
  );

  return (
    <>
      {success && (
        <BookingSuccessModal
          name={displayName}
          phone={userData?.phone}
          address={displayAddress}
          date={selectedDate}
          timeSlot={selectedTime}
          onClose={() => setSuccess(false)}
        />
      )}

      <PageLayout footer={footer} scrollable>
        <div className="px-6 py-5 space-y-5 pb-6">

        {/* Customer summary card */}
        <section aria-label="Customer">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 overflow-hidden">
                <span className="material-symbols-outlined fill-icon text-[48px] text-outline-variant translate-y-1">account_circle</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-primary leading-tight">
                  {displayName}
                </h3>
                {userData?.phone && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>call</span>
                    <p className="font-body text-xs text-on-surface-variant">{userData.phone}</p>
                  </div>
                )}
                {displayAddress && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>location_on</span>
                    <p className="font-body text-xs text-on-surface-variant">{displayAddress}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">calendar_today</span>
                <span className="font-body text-sm font-medium">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">schedule</span>
                <span className="font-body text-sm font-medium">{selectedTime || '—'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Date strip */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline font-bold text-base text-primary">{t('booking.selectDate')}</h2>
            <div className="flex items-center gap-1.5 bg-surface-container rounded-full px-3 py-1">
              <span className="material-symbols-outlined text-primary text-[14px]" aria-hidden="true">calendar_month</span>
              <span className="font-label text-[11px] text-on-surface-variant font-semibold">{monthLabel}</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1">
            {dates.map(({ d, ds }) => (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`flex-shrink-0 flex flex-col items-center justify-center rounded-full w-[52px] h-[52px] transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                  ds === selectedDate
                    ? 'bg-primary text-on-primary shadow-md active:scale-95'
                    : 'bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                <span className={`font-label text-[9px] uppercase font-semibold leading-none mb-0.5 ${ds === selectedDate ? 'opacity-80' : 'text-on-surface-variant'}`}>
                  {t('days', { returnObjects: true })[d.getDay()]}
                </span>
                <span className={`font-headline font-bold text-sm leading-none ${ds === selectedDate ? '' : 'text-on-surface'}`}>
                  {d.getDate()}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Time slots */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-base text-primary">{t('booking.availableTimeslots')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`rounded-lg font-body py-2 px-3 text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary ${
                  slot === selectedTime
                    ? 'border-[1.5px] border-primary bg-primary text-on-primary font-semibold shadow-sm'
                    : 'border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className={`material-symbols-outlined text-[14px] ${slot === selectedTime ? 'opacity-80' : 'text-on-surface-variant'}`}>schedule</span>
                <span className={slot === selectedTime ? '' : 'font-medium'}>{slot}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-3 pb-4">
          <label className="font-headline font-bold text-base text-primary block">
            {t('booking.notes')} <span className="font-normal text-on-surface-variant text-sm">{t('booking.optional')}</span>
          </label>
          <div className="relative group">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-28 p-4 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest font-body text-sm text-on-surface placeholder:text-on-surface-variant/60 resize-none transition-colors outline-none"
              placeholder={t('booking.notesPlaceholder')}
            />
            {!notes && (
              <div className="absolute bottom-3 right-3 pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-[20px]" aria-hidden="true">edit_note</span>
              </div>
            )}
          </div>
        </section>

        </div>
      </PageLayout>
    </>
  );
}
