import SuccessModal from '../ui/SuccessModal';

const ROW = ({ label, value }) => (
  <div className="flex gap-3 text-sm font-body">
    <span className="w-16 flex-shrink-0 text-on-surface-variant font-semibold">{label}</span>
    <span className="text-on-surface truncate">{value || '—'}</span>
  </div>
);

/**
 * Props:
 *  - name      {string}    Customer display name
 *  - phone     {string}    Customer phone
 *  - address   {string}    Customer address
 *  - date      {string}    Appointment date (YYYY-MM-DD)
 *  - timeSlot  {string}    Selected time slot
 *  - onClose   {function}  Called when close or Done is pressed
 */
function formatDate(dateStr) {
  if (!dateStr) return { weekday: '—', day: '—', month: '' };
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    day:     d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    year:    d.getFullYear(),
  };
}

export default function BookingSuccessModal({ name, phone, address, date, timeSlot, onClose }) {
  const { weekday, day, year } = formatDate(date);

  return (
    <SuccessModal
      title="Booking Confirmed!"
      onClose={onClose}
      headerInline
      action={
        <button
          onClick={onClose}
          className="w-full bg-primary text-on-primary font-headline font-bold py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all text-sm shadow-[0_4px_12px_rgba(0,79,69,0.2)] flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">check</span>
          Done
        </button>
      }
    >
      {/* Appointment date/time — 2 columns */}
      <div className="w-full bg-primary/10 rounded-lg mb-2 border border-primary/20 overflow-hidden">
        <p className="text-[10px] font-label font-semibold text-primary uppercase tracking-wider text-center pt-2 pb-1">
          Appointment
        </p>
        <div className="flex divide-x divide-primary/20">
          {/* Date */}
          <div className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5">
            <span className="text-[9px] font-label font-semibold text-primary/60 uppercase tracking-wider">Date</span>
            <span className="text-lg font-headline font-bold text-primary leading-none">{day} {year}</span>
          </div>
          {/* Time */}
          <div className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5">
            <span className="text-[9px] font-label font-semibold text-primary/60 uppercase tracking-wider">Time</span>
            <span className="text-lg font-headline font-bold text-primary leading-none">{timeSlot || '—'}</span>
          </div>
        </div>
      </div>

      {/* Customer info */}
      <div className="w-full bg-surface-container rounded-lg px-3 py-2 flex flex-col gap-1.5 border border-outline-variant/30 text-left">
        <ROW label="Name"    value={name} />
        <ROW label="Phone"   value={phone} />
        <ROW label="Address" value={address} />
      </div>
    </SuccessModal>
  );
}
