import { useState, useEffect } from 'react';
import { useLiff } from './hooks/useLiff';
import { getCustomerByLineId, getCustomerById } from './api/customerApi';
import RegisterCustomer from './pages/RegisterCustomer';
import BookPickup from './pages/BookPickup';

const DEV_PREVIEWS = import.meta.env.DEV
  ? { 'register-success': () => import('./pages/dev/RegisterSuccessPreview') }
  : {};

/**
 * App flow:
 *  A. URL has ?custId=xxx
 *     → load customer by ID → BookPickup (or Register if not found)
 *  B. Opened inside LINE (LIFF ready)
 *     → look up by LINE userId → BookPickup or RegisterCustomer
 *  C. Opened in normal browser (no-line)
 *     → go straight to RegisterCustomer (no LINE profile)
 */
export default function App() {
  const liff = useLiff();
  const [view, setView] = useState('loading'); // 'loading' | 'register' | 'booking'
  const [customerData, setCustomerData] = useState(null);
  const [DevPreview, setDevPreview] = useState(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const key = new URLSearchParams(window.location.search).get('dev');
    if (key && DEV_PREVIEWS[key]) {
      DEV_PREVIEWS[key]().then((m) => setDevPreview(() => m.default));
    }
  }, []);

  useEffect(() => {
    if (liff.status === 'loading') return;

    const custId = new URLSearchParams(window.location.search).get('custId');

    // --- Case A: custId in URL ---
    if (custId) {
      getCustomerById(custId)
        .then((res) => {
          if (res.status === 'found') {
            setCustomerData(res.data);
            setView('booking');
          } else {
            setView('register');
          }
        })
        .catch(() => setView('register'));
      return;
    }

    // --- Case B: inside LINE ---
    if (liff.status === 'ready') {
      getCustomerByLineId(liff.profile.userId)
        .then((res) => {
          if (res.status === 'found') {
            setCustomerData(res.data);
            setView('booking');
          } else {
            setView('register');
          }
        })
        .catch(() => setView('register'));
      return;
    }

    // --- Case C: normal browser, no custId ---
    if (liff.status === 'no-line') {
      setView('register');
    }
  }, [liff.status, liff.profile]);

  const handleRegisterSuccess = (data) => {
    setCustomerData(data);
    setView('booking');
  };

  if (DevPreview) return <DevPreview />;

  if (view === 'loading' || liff.status === 'loading') {
    return <SplashScreen />;
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
