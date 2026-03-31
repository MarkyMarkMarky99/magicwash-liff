import { useState } from 'react';
import BookingSuccessModal from '../../components/booking/BookingSuccessModal';

export default function BookingSuccessPreview() {
  const [show, setShow] = useState(true);

  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
      {/* Fake blurred background resembling BookPickup */}
      <header className="flex-none bg-primary text-on-primary px-4 py-3 shadow-md">
        <h1 className="text-lg font-headline font-bold tracking-tight">Book Pickup</h1>
      </header>
      <main className="flex-1 overflow-hidden px-6 py-5 select-none pointer-events-none opacity-40 space-y-4">
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 h-24" />
        <div className="h-4 bg-surface-container rounded w-32" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-[52px] h-[52px] rounded-full bg-surface-container border border-outline-variant/30 flex-shrink-0" />
          ))}
        </div>
        <div className="h-4 bg-surface-container rounded w-40" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-container rounded-lg border border-outline-variant/30" />
          ))}
        </div>
      </main>
      <footer className="flex-none p-4 bg-surface border-t border-outline-variant/20">
        <div className="w-full h-14 bg-primary rounded-xl" />
      </footer>

      {show && (
        <BookingSuccessModal
          name="John Doe"
          phone="081-234-5678"
          address="123 Sukhumvit Rd, Bangkok"
          date="2026-04-02"
          timeSlot="10:00-12:00"
          onClose={() => setShow(false)}
        />
      )}

      {!show && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <button
            onClick={() => setShow(true)}
            className="bg-primary text-on-primary font-headline font-bold px-6 py-3 rounded-xl shadow-lg"
          >
            Preview Again
          </button>
        </div>
      )}
    </div>
  );
}
