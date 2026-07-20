import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createAppointment } from '../api/customerApi';
import {
  getAppointmentsFresh,
  findBlockingAppointment,
  clearAppointmentsCache,
  bookingKey,
  acquireBookingLock,
  releaseBookingLock,
  markRecentBooking,
  hasRecentBooking,
  markUncertainBooking,
  clearUncertainBooking,
  hasUncertainBooking,
} from '../api/appointmentApi';
import { formatDisplayDate, getDateLocale } from '../api/dateUtils';
import PageLayout from '../components/layout/PageLayout';
import BookingSuccessModal from '../components/booking/BookingSuccessModal';
const TIME_SLOTS = ['10:00-12:00', '13:00-15:00', '15:00-17:00', '18:00-20:00'];

function toDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getSlotStartMinutes(slot) {
  const [h, m] = slot.split('-')[0].split(':').map(Number);
  return h * 60 + m;
}

function getNext14Days() {
  const result = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 13; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push({ d, ds: toDateStr(d) });
  }
  return result;
}

export default function BookPickup({ userData, type = 'pickup', orderId = null, onDone, onBusyChange }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';
  // Computed per render so it does not go stale if the app stays open across midnight.
  const todayStr = toDateStr(new Date());
  const customerId = userData?.customerId || userData?.uuid || '';

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (now.getDay() !== 2 && TIME_SLOTS.some(s => getSlotStartMinutes(s) > nowMinutes)) {
      return toDateStr(now);
    }
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 2) d.setDate(d.getDate() + 1);
    return toDateStr(d);
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const startOnToday = new Date().getDay() !== 2 && TIME_SLOTS.some(s => getSlotStartMinutes(s) > nowMinutes);
    if (!startOnToday) return null;
    return TIME_SLOTS.find(s => getSlotStartMinutes(s) > nowMinutes) || null;
  });
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [addressExpanded, setAddressExpanded] = useState(false);

  // Booking guard: gate the form on a fresh read of existing appointments.
  const [guardState, setGuardState] = useState('checking'); // 'checking' | 'ready' | 'blocked' | 'error'
  const [guardErrorKind, setGuardErrorKind] = useState(null); // 'read' | 'missingOrder'
  const [blockingAppt, setBlockingAppt] = useState(null);
  // After an ambiguous POST (timeout/error), the append may or may not have landed —
  // force a fresh guard check before the next submit so a retry can't duplicate.
  const [mustRecheck, setMustRecheck] = useState(false);

  const key = bookingKey({ customerId, type, orderId });

  const runGuard = useCallback(async () => {
    setGuardErrorKind(null);
    setBlockingAppt(null);
    setGuardState('checking');

    if (!customerId) { setGuardState('error'); setGuardErrorKind('read'); return; }
    if (type === 'delivery' && !String(orderId ?? '').trim()) {
      setGuardState('error'); setGuardErrorKind('missingOrder'); return;
    }

    try {
      const list = await getAppointmentsFresh(customerId);
      const blocking = findBlockingAppointment(list, { type, orderId });
      if (blocking) {
        setBlockingAppt(blocking);
        setGuardState('blocked');
      } else if (hasRecentBooking(key)) {
        // Just booked but GViz may not reflect it yet — stay blocked without details.
        setBlockingAppt(null);
        setGuardState('blocked');
      } else {
        // A prior uncertain attempt (possibly from another mount) forces a recheck before submit.
        setMustRecheck(hasUncertainBooking(key));
        setGuardState('ready');
      }
    } catch {
      // Fail-closed: cannot verify → do not allow booking.
      setGuardState('error');
      setGuardErrorKind('read');
    }
  }, [customerId, type, orderId, key]);

  useEffect(() => { runGuard(); }, [runGuard]);

  const dates = getNext14Days();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isSlotDisabled = (slot) => selectedDate === todayStr && getSlotStartMinutes(slot) <= nowMinutes;

  const handleDateSelect = (ds) => {
    setSelectedDate(ds);
    if (ds === todayStr && selectedTime) {
      const nm = new Date().getHours() * 60 + new Date().getMinutes();
      if (getSlotStartMinutes(selectedTime) <= nm) {
        setSelectedTime(TIME_SLOTS.find(s => getSlotStartMinutes(s) > nm) || null);
      }
    }
  };

  const canConfirm = selectedDate && selectedTime;

  const formattedDate = (() => {
    if (!selectedDate) return '—';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const monthLabel = (() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' });
  })();

  const displayName = userData?.customerName
    || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();
  const displayAddress = (userData?.address || '').trim();

  const handleConfirm = async () => {
    if (!canConfirm || guardState !== 'ready') return;
    // Cross-remount guard: another in-flight submit for the same booking is running.
    if (!acquireBookingLock(key)) return;
    setIsBooking(true);
    setBookingError(null);
    onBusyChange?.(true);
    try {
      // Retry after an uncertain previous attempt: re-verify against live data first.
      if (mustRecheck) {
        const list = await getAppointmentsFresh(customerId);
        const blocking = findBlockingAppointment(list, { type, orderId });
        if (blocking || hasRecentBooking(key)) {
          setBlockingAppt(blocking || null);
          setGuardState('blocked');
          return;
        }
        setMustRecheck(false);
      }

      const res = await createAppointment({
        customerId,
        appointmentDate: selectedDate,
        timeSlot:        selectedTime,
        address:         userData?.address || '',
        notes,
        type,
        orderId,
      });
      if (res.status === 'success') {
        markRecentBooking(key);
        clearUncertainBooking(key);
        clearAppointmentsCache(customerId);
        setSuccess(true);
      } else {
        markUncertainBooking(key);
        setMustRecheck(true);
        setBookingError(res.message || 'Booking failed');
      }
    } catch (err) {
      markUncertainBooking(key);
      setMustRecheck(true);
      setBookingError(err.message);
    } finally {
      setIsBooking(false);
      releaseBookingLock(key);
      onBusyChange?.(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccess(false);
    onDone?.();
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
          onClose={handleSuccessClose}
        />
      )}

      <PageLayout footer={guardState === 'ready' ? footer : null} scrollable>

        {/* Guard: checking */}
        {guardState === 'checking' && (
          <div className="flex-1 h-full flex flex-col items-center justify-center gap-3 px-6">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin">sync</span>
            <p className="font-body text-on-surface-variant text-sm text-center">{t('booking.checking')}</p>
          </div>
        )}

        {/* Guard: error (fail-closed) */}
        {guardState === 'error' && (
          <div className="flex-1 h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="material-symbols-outlined text-error text-5xl">error_outline</span>
            <h2 className="font-headline font-bold text-base text-on-surface">
              {guardErrorKind === 'missingOrder' ? t('booking.deliveryMissingOrder') : t('booking.checkErrorTitle')}
            </h2>
            {guardErrorKind !== 'missingOrder' && (
              <>
                <p className="font-body text-sm text-on-surface-variant">{t('booking.checkErrorDesc')}</p>
                <button
                  onClick={runGuard}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  {t('booking.retry')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Guard: blocked — show the existing appointment */}
        {guardState === 'blocked' && (
          <div className="flex-1 h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[36px]">event_available</span>
            </div>
            <h2 className="font-headline font-bold text-lg text-on-surface leading-snug">
              {type === 'delivery' ? t('booking.blockedDeliveryTitle') : t('booking.blockedPickupTitle')}
            </h2>
            {blockingAppt && (
              <div className="w-full max-w-[320px] border border-outline-variant/40 rounded-2xl px-4 pt-6 pb-4 relative text-left">
                <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">
                  {t('booking.existingAppointment')}
                </p>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary">
                    {t(type === 'delivery' ? 'booking.typeDelivery' : 'booking.typePickup')}
                  </span>
                  {blockingAppt.appointmentId && (
                    <span className="font-label text-[10px] text-on-surface-variant tracking-wide truncate">{blockingAppt.appointmentId}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">calendar_today</span>
                    <span className="font-body text-sm font-medium">{formatDisplayDate(blockingAppt.appointmentDate, undefined, getDateLocale(i18n.language))}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">schedule</span>
                    <span className="font-body text-sm font-medium">{blockingAppt.timeSlot || '—'}</span>
                  </div>
                </div>
              </div>
            )}
            <p className="font-body text-xs text-on-surface-variant">{t('booking.blockedDesc')}</p>
          </div>
        )}

        {/* Ready — booking form */}
        {guardState === 'ready' && (
        <div className="px-6 py-5 space-y-5 pb-6">

        {/* Summary — OrderInfoCard style */}
        <section className="space-y-4" aria-label="Booking summary">

          {/* Row 1: identifier left, type chip right */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest mb-0.5">
                {type === 'delivery' ? t('activeOrder.orderNumber') : t('customerOrders.customerNo')}
              </p>
              <h2 className="font-headline font-bold text-[22px] text-on-surface leading-tight truncate">
                {type === 'delivery' ? orderId : (userData?.customerIndex && userData?.phone ? `${userData.customerIndex}-${String(userData.phone).slice(-4)}` : userData?.customerId || '—')}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">{t('booking.typeLabel')}</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary">
                {t(type === 'delivery' ? 'booking.typeDelivery' : 'booking.typePickup')}
              </span>
            </div>
          </div>

          {/* Customer details — CustomerInfo style */}
          <div className="relative border border-outline-variant/40 rounded-2xl px-4 pt-6 pb-4">
            <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">
              {t('activeOrder.customer.details')}
            </p>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 overflow-hidden">
                <span className="material-symbols-outlined fill-icon text-[44px] text-outline-variant translate-y-1">account_circle</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-bold text-[15px] text-primary leading-tight truncate">{displayName || '—'}</h3>
                {userData?.phone && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>call</span>
                    <p className="font-body text-[11px] text-on-surface-variant">{userData.phone}</p>
                  </div>
                )}
                {displayAddress && (
                  <button onClick={() => setAddressExpanded(v => !v)} className="flex items-start gap-1 mt-0.5 text-left w-full focus:outline-none">
                    <span className="material-symbols-outlined text-on-surface-variant mt-px flex-shrink-0" style={{ fontSize: '13px' }}>location_on</span>
                    <p className={`font-body text-[11px] text-on-surface-variant leading-snug ${addressExpanded ? '' : 'line-clamp-1'}`}>{displayAddress}</p>
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-outline-variant/25">
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
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6 py-1">
            {dates.map(({ d, ds }) => {
              const isTuesday = d.getDay() === 2;
              return (
              <button
                key={ds}
                onClick={() => !isTuesday && handleDateSelect(ds)}
                disabled={isTuesday}
                className={`flex-shrink-0 flex flex-col items-center justify-center rounded-full w-[52px] h-[52px] transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                  isTuesday
                    ? 'bg-surface-container border border-outline-variant/20 opacity-40 cursor-not-allowed'
                    : ds === selectedDate
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
            );})}
          </div>
        </section>

        {/* Time slots */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-base text-primary">{t('booking.availableTimeslots')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((slot) => {
              const disabled = isSlotDisabled(slot);
              return (
              <button
                key={slot}
                onClick={() => !disabled && setSelectedTime(slot)}
                disabled={disabled}
                className={`rounded-lg font-body py-2 px-3 text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary ${
                  disabled
                    ? 'border border-outline-variant/20 bg-surface-container opacity-40 cursor-not-allowed'
                    : slot === selectedTime
                    ? 'border-[1.5px] border-primary bg-primary text-on-primary font-semibold shadow-sm'
                    : 'border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className={`material-symbols-outlined text-[14px] ${slot === selectedTime ? 'opacity-80' : 'text-on-surface-variant'}`}>schedule</span>
                <span className={slot === selectedTime ? '' : 'font-medium'}>{slot}</span>
              </button>
            );})}

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
        )}
      </PageLayout>
    </>
  );
}
