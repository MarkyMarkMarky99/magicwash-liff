import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createAppointment } from '../../api/customerApi';
import HeroSheet from '../layout/HeroSheet';
import BookingForm from '../forms/BookingForm';
import BookingSuccessView from '../register-line/BookingSuccessView';
import FormHeader from '../register-line/FormHeader';
import SubmitButton from '../register-line/SubmitButton';

function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Booking appointment overlay built on HeroSheet.
 * Props:
 *   isOpen       — show/hide
 *   onClose      — dismiss without completing (green area tap)
 *   onDone       — Done tapped after success (defaults to onClose)
 *   customer     — { customerId, address, phone, customerName }
 *   customerSub  — optional subtitle override in the green header
 */
export default function BookingSheet({ isOpen, onClose, onDone, customer }) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate]         = useState(tomorrowStr);
  const [selectedTime, setSelectedTime]         = useState(null);
  const [notes, setNotes]                       = useState('');
  const [isBooking, setIsBooking]               = useState(false);
  const [bookingError, setBookingError]         = useState(null);
  const [isBookingValid, setIsBookingValid]     = useState(false);
  const [showSuccess, setShowSuccess]           = useState(false);
  const [bookingData, setBookingData]           = useState(null);

  // Reset state every time the sheet opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(tomorrowStr());
      setSelectedTime(null);
      setNotes('');
      setBookingError(null);
      setIsBookingValid(false);
      setShowSuccess(false);
      setBookingData(null);
    }
  }, [isOpen]);

  const handleBooking = async (e) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingError(null);
    try {
      const res = await createAppointment({
        customerId:      customer?.customerId || '',
        appointmentDate: selectedDate,
        timeSlot:        selectedTime,
        address:         customer?.address || '',
        notes,
      });
      if (res.status === 'success') {
        setBookingData({ date: selectedDate, timeSlot: selectedTime });
        setShowSuccess(true);
      } else {
        setBookingError(res.message || t('booking.error'));
      }
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setIsBooking(false);
    }
  };

  const displayName = customer?.customerName || '';

  const hero = (
    <div className="absolute inset-0 px-8 pt-12 cursor-pointer">
      <h2 className="font-headline font-bold text-3xl text-on-primary leading-tight">{displayName}</h2>
      <div className="mt-3 space-y-1.5">
        {[
          { icon: 'tag',         value: customer?.customerIndex },
          { icon: 'phone',       value: customer?.phone },
          { icon: 'location_on', value: customer?.address },
        ].filter(r => r.value).map(({ icon, value }) => (
          <div key={icon} className="flex items-start gap-2 text-on-primary/80 text-sm font-body">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0">{icon}</span>
            <span className="leading-snug">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <HeroSheet
      isOpen={isOpen}
      onClose={onClose}
      hero={hero}
    >
      <FormHeader
        icon={showSuccess ? 'check_circle' : 'calendar_month'}
        title={showSuccess ? t('bookingSuccess.title') : t('booking.pageTitle')}
        subtitle={showSuccess ? t('bookingSuccess.subtitle') : t('booking.pageSubtitle')}
      />

      {showSuccess ? (
        <BookingSuccessView
          registeredData={{ firstName: displayName, phone: customer?.phone, address: customer?.address }}
          date={bookingData?.date}
          timeSlot={bookingData?.timeSlot}
        />
      ) : (
        <>
          {bookingError && (
            <div className="mb-3 p-3 bg-error/10 border border-error/30 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0">error</span>
              <p className="text-error text-sm font-body">{bookingError}</p>
            </div>
          )}
          <BookingForm
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            notes={notes}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            onNotesChange={setNotes}
            onSubmit={handleBooking}
            disabled={isBooking}
            onValidChange={setIsBookingValid}
          />
        </>
      )}

      <SubmitButton
        {...(showSuccess
          ? { onClick: () => (onDone ?? onClose)(), idleIcon: 'check', idleLabelKey: 'bookingSuccess.done' }
          : { form: 'booking-form', disabled: !isBookingValid, isSubmitting: isBooking, idleIcon: 'event_available', idleLabelKey: 'booking.confirm', submittingLabelKey: 'booking.booking' }
        )}
      />
    </HeroSheet>
  );
}
