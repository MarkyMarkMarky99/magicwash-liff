import { useState, useEffect } from 'react';
import { useLiff } from './hooks/useLiff';
import { getCustomerByLineId } from './api/customerApi';
import RegisterCustomer from './pages/RegisterCustomer';
import BookPickup from './pages/BookPickup';

/**
 * App flow:
 *  1. LIFF initializes → get LINE userId
 *  2. Query AppScript for existing customer
 *  3a. Found     → go straight to BookPickup
 *  3b. Not found → show RegisterCustomer (pre-filled with LINE display name)
 *  3c. After registration → go to BookPickup
 */
export default function App() {
  const liff = useLiff();
  const [view, setView] = useState('loading'); // 'loading' | 'register' | 'booking'
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => {
    if (liff.status !== 'ready') return;

    getCustomerByLineId(liff.profile.userId)
      .then((res) => {
        if (res.status === 'found') {
          setCustomerData(res.data);
          setView('booking');
        } else {
          setView('register');
        }
      })
      .catch(() => {
        // Network error — let user register; they can still proceed
        setView('register');
      });
  }, [liff.status, liff.profile]);

  const handleRegisterSuccess = (data) => {
    setCustomerData(data);
    setView('booking');
  };

  if (view === 'loading' || liff.status === 'loading') {
    return <SplashScreen />;
  }

  if (liff.status === 'error') {
    return <ErrorScreen message={liff.error} />;
  }

  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
      {view === 'booking'
        ? <BookPickup userData={customerData} />
        : <RegisterCustomer
            lineProfile={liff.profile}
            onRegisterSuccess={handleRegisterSuccess}
          />
      }
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col items-center justify-center gap-4">
      <span className="material-symbols-outlined text-primary text-[56px] animate-pulse">local_laundry_service</span>
      <p className="font-body text-on-surface-variant text-sm">Loading…</p>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="material-symbols-outlined text-error text-[48px]">error</span>
      <p className="font-headline font-bold text-on-surface">Unable to open</p>
      <p className="font-body text-on-surface-variant text-sm">Please open this app through the LINE app.</p>
      {message && <p className="font-mono text-xs text-outline mt-2">{message}</p>}
    </div>
  );
}
