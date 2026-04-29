import { useTranslation } from 'react-i18next';
import AppointmentDetailsCard from '../components/confirm-booking/AppointmentDetailsCard';
import LocationCard from '../components/confirm-booking/LocationCard';

/**
 * Props:
 *  - name          {string}    Customer display name
 *  - phone         {string}    Customer phone
 *  - address       {string}    Customer address
 *  - date          {string}    Appointment date (YYYY-MM-DD)
 *  - timeSlot      {string}    Selected time slot (e.g. "10:00-12:00")
 *  - notes         {string}    Customer notes / special instructions (optional)
 *  - appointmentId {string}    Appointment reference ID (optional)
 *  - onDone        {function}  Called when Done button is pressed
 */
export default function ConfirmBooking({ name, phone, address, date, timeSlot, notes, appointmentId, onDone }) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 z-[60] flex flex-col font-body text-on-surface bg-[#f8f9fb]">

      {/* ── Hero ── */}
      <div
        className="flex-none flex flex-col items-center justify-end pb-10 pt-14 px-6 text-center rounded-b-[40px] shadow-lg"
        style={{ background: 'linear-gradient(160deg, #00897b 0%, #26c6b0 100%)' }}
      >
        <div className="mb-5 w-[72px] h-[72px] rounded-full bg-white shadow-xl ring-4 ring-white/30 flex items-center justify-center">
          <span className="material-symbols-outlined fill-icon text-primary text-[40px]">check</span>
        </div>
        <h1 className="font-headline text-[22px] font-bold text-white leading-tight">
          {t('bookingSuccess.title')}
        </h1>
        {appointmentId && (
          <p className="mt-1.5 text-xs text-white/60 tracking-wide">ID: {appointmentId}</p>
        )}
        <p className="mt-3 text-sm text-white/75 max-w-[240px] leading-snug">
          {t('confirmBooking.subtitle')}
        </p>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-6 pb-32 flex flex-col gap-4">
        <AppointmentDetailsCard name={name} phone={phone} date={date} timeSlot={timeSlot} notes={notes} />
        {address && <LocationCard address={address} />}
      </div>

      {/* ── Footer: floating Done button ── */}
      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-16 bg-gradient-to-t from-[#f8f9fb] via-[#f8f9fb] to-transparent pointer-events-none">
        <button
          onClick={onDone}
          className="w-full bg-white text-primary font-headline font-bold text-[15px] py-4 rounded-2xl shadow-[0_5px_15px_-5px_rgba(0,79,69,0.35)] border border-gray-100 hover:scale-[1.02] active:scale-95 transition-transform pointer-events-auto"
        >
          {t('bookingSuccess.done')}
        </button>
      </div>

    </div>
  );
}
