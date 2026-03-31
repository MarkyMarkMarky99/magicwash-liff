import { useState } from 'react';
import RegisterSuccessModal from '../../components/register/RegisterSuccessModal';

export default function RegisterSuccessPreview() {
  const [show, setShow] = useState(true);
  const reset = () => setShow(true);

  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
      {/* Fake blurred background resembling RegisterCustomer */}
      <header className="flex-none bg-primary text-on-primary px-4 py-3 shadow-md">
        <h1 className="text-lg font-headline font-bold tracking-tight">New Customer</h1>
      </header>
      <main className="flex-1 overflow-hidden px-5 pt-6 pb-4 select-none pointer-events-none opacity-40">
        <div className="mb-5 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-primary text-[36px]">person_add</span>
          </div>
          <h2 className="text-xl font-headline font-bold text-primary mb-1">Create Account</h2>
          <p className="text-on-surface-variant font-body text-sm">Please enter your details to register.</p>
        </div>
        <div className="space-y-3">
          {['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Address'].map((label) => (
            <div key={label}>
              <div className="block text-primary font-headline font-bold text-xs mb-1.5">{label}</div>
              <div className="w-full h-10 bg-surface-container border border-outline-variant/30 rounded-xl" />
            </div>
          ))}
        </div>
      </main>
      <footer className="flex-none p-4 bg-surface border-t border-outline-variant/20">
        <div className="w-full h-14 bg-surface-container-high rounded-xl" />
      </footer>

      {/* Modal */}
      {show && (
        <RegisterSuccessModal
          data={{
            label: 'MW-00042',
            firstName: 'John',
            lastName: 'Doe',
            phone: '081-234-5678',
            email: 'john.doe@example.com',
            address: '123 Sukhumvit Rd, Bangkok 10110',
          }}
          onContinue={() => setShow(false)}
        />
      )}

      {/* Dev controls */}
      {!show && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <button
            onClick={reset}
            className="bg-primary text-on-primary font-headline font-bold px-6 py-3 rounded-xl shadow-lg"
          >
            Preview Again
          </button>
        </div>
      )}
    </div>
  );
}
