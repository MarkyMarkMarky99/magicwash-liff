import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiff } from './hooks/useLiff';
import { getCustomerByLineId, getCustomerById } from './api/customerApi';
import RegisterCustomer from './pages/RegisterCustomer';
import BookPickup from './pages/BookPickup';
import OrderChat from './pages/OrderChat';
import OrderGallery from './pages/OrderGallery';


/**
 * App flow:
 *  A. URL has ?gallery&orderId=xxx
 *     → render OrderGallery directly, no LIFF check
 *  B. URL has ?custId=xxx
 *     → load customer by ID → BookPickup (or Register if not found)
 *  C. Opened inside LINE (LIFF ready)
 *     → look up by LINE userId → BookPickup or RegisterCustomer
 *  D. Opened in normal browser (no-line)
 *     → go straight to RegisterCustomer (no LINE profile)
 */
export default function App() {
  const params = new URLSearchParams(window.location.search);

  // --- Gallery route: standalone, no LIFF ---
  // URL: /?gallery&orderId=ORD-12345
  if (params.has('gallery')) {
    return <OrderGallery orderId={params.get('orderId')} />;
  }

  return <AppMain />;
}

function AppMain() {
  const liff = useLiff();
  const [view, setView] = useState('loading'); // 'loading' | 'register' | 'booking'
  const [customerData, setCustomerData] = useState(null);

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

  // Dev preview: ?dev=chat — bypass LIFF wait entirely
  const devParam = new URLSearchParams(window.location.search).get('dev');
  const dummyUser = { customerName: 'บุสรินทร์ หอมวิเชียร (โบ)', customerId: 'CUS-88291', phone: '081-234-5678', address: '123 ถนนสุขุมวิท, กรุงเทพฯ' };
  if (devParam === 'chat') {
    return (
      <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
        <OrderChat userData={dummyUser} appointmentDate="2026-04-05" appointmentTime="10:00 - 12:00 น." />
      </div>
    );
  }

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
  const { t } = useTranslation();
  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col items-center justify-center gap-4">
      <span className="material-symbols-outlined text-primary text-[56px] animate-pulse">local_laundry_service</span>
      <p className="font-body text-on-surface-variant text-sm">{t('loading')}</p>
    </div>
  );
}
