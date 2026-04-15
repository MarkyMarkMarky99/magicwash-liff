import { useState, useEffect, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiff } from './hooks/useLiff';
import { getCustomerByLineId, getCustomerById } from './api/customerApi';
import { parseSheetDate } from './api/dateUtils';
import RegisterCustomer from './pages/RegisterCustomer';
import BookPickup from './pages/BookPickup';
import OrderChat from './pages/OrderChat';
import OrderGallery from './pages/OrderGallery';
import CustomerOrders from './pages/CustomerOrders';
import ListView from './pages/ListView';
import LanguageSwitcher from './components/ui/LanguageSwitcher';
import OrderCard from './components/customer-orders/OrderCard';
import OrderDetailSheet from './components/customer-orders/OrderDetailSheet';

/**
 * Config map for the generic ListView page.
 * URL pattern: /?list&type=<key>&<...params>
 *
 * To add a new list type, add an entry here — no new page file needed.
 */
const LIST_CONFIG = {
  orders: {
    title: 'ออเดอร์ทั้งหมด',
    icon: 'receipt_long',
    fetchFn: (params) => getCustomerById(params.get('custId')),
    getItems: (data) => data.orders ?? [],
    sortFn: (a, b) => (parseSheetDate(b.date) ?? 0) - (parseSheetDate(a.date) ?? 0),
    renderItem: (order, { onOpenDetail, onOpenGallery }) => (
      <OrderCard
        key={order.orderId}
        order={order}
        onSelectOrder={onOpenDetail}
        onViewPhotos={onOpenGallery}
      />
    ),
    renderDetail: (orderId, { onClose, onOpenGallery }) => (
      <OrderDetailSheet orderId={orderId} onClose={onClose} onViewPhotos={onOpenGallery} />
    ),
    renderGallery: (orderId, { onBack }) => (
      <OrderGallery orderId={orderId} onBack={onBack} />
    ),
    emptyText: 'ยังไม่มีออเดอร์',
    backUrl: (params) => `/?orders&custId=${params.get('custId')}`,
  },
};

/** Pages use this context to set / clear the header's back button. */
export const HeaderContext = createContext(null);

/**
 * Shared app shell — renders the single header used by every page.
 * Pages that need a back button call setOnBack (from HeaderContext).
 */
function AppShell({ children }) {
  const [onBack, setOnBack] = useState(null);

  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
      <header className="flex-none bg-primary text-on-primary px-4 py-3 flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-1">
          {onBack && (
            <button
              onClick={onBack}
              className="text-on-primary -ml-1.5 mr-0.5 h-7 flex items-center px-1 hover:opacity-70 active:scale-95 transition-all focus:outline-none"
            >
              <span className="material-symbols-outlined text-[22px] leading-none">arrow_back</span>
            </button>
          )}
          <h1 className="text-lg font-headline font-bold tracking-tight flex items-center gap-2">
            <img src="/logo.png" alt="logo" className="h-7 w-7 rounded-full object-cover" />
            Magicwash Laundry
          </h1>
        </div>
        <LanguageSwitcher />
      </header>

      <HeaderContext.Provider value={setOnBack}>
        {children}
      </HeaderContext.Provider>
    </div>
  );
}

/**
 * App flow:
 *  A. URL has ?gallery&orderId=xxx
 *     → render OrderGallery directly, no LIFF check
 *  B. URL has ?orders&custId=xxx
 *     → render CustomerOrders directly, no LIFF check
 *  C. URL has ?custId=xxx
 *     → load customer by ID → BookPickup (or Register if not found)
 *  D. Opened inside LINE (LIFF ready)
 *     → look up by LINE userId → BookPickup or RegisterCustomer
 *  E. Opened in normal browser (no-line)
 *     → go straight to RegisterCustomer (no LINE profile)
 */
export default function App() {
  const params = new URLSearchParams(window.location.search);

  // --- Generic list route: standalone, no LIFF ---
  // URL: /?list&type=orders&custId=CUS-12345
  if (params.has('list')) {
    const cfg = LIST_CONFIG[params.get('type')];
    if (cfg) {
      return (
        <AppShell>
          <ListView
            title={cfg.title}
            icon={cfg.icon}
            fetchFn={() => cfg.fetchFn(params)}
            getItems={cfg.getItems}
            sortFn={cfg.sortFn}
            renderItem={cfg.renderItem}
            renderDetail={cfg.renderDetail}
            renderGallery={cfg.renderGallery}
            emptyText={cfg.emptyText}
            backUrl={cfg.backUrl(params)}
          />
        </AppShell>
      );
    }
  }

  // --- Gallery route: standalone, no LIFF ---
  // URL: /?gallery&orderId=ORD-12345
  if (params.has('gallery')) {
    return (
      <AppShell>
        <OrderGallery orderId={params.get('orderId')} />
      </AppShell>
    );
  }

  // --- Customer orders route: standalone, no LIFF ---
  // URL: /?orders&custId=CUS-12345
  if (params.has('orders')) {
    return (
      <AppShell>
        <CustomerOrders custId={params.get('custId')} />
      </AppShell>
    );
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
      getCustomerById(custId, (fresh) => {
        if (fresh.status === 'found') setCustomerData(fresh.data);
      })
        .then((res) => {
          if (res.status === 'found') { setCustomerData(res.data); setView('booking'); }
          else setView('register');
        })
        .catch(() => setView('register'));
      return;
    }

    // --- Case B: inside LINE ---
    if (liff.status === 'ready') {
      getCustomerByLineId(liff.profile.userId, (fresh) => {
        if (fresh.status === 'found') setCustomerData(fresh.data);
      })
        .then((res) => {
          if (res.status === 'found') { setCustomerData(res.data); setView('booking'); }
          else setView('register');
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

  // Dev preview: ?dev=chat — OrderChat has its own ChatHeader, keep standalone container
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
    <AppShell>
      {view === 'booking'
        ? <BookPickup userData={customerData} />
        : <RegisterCustomer
            lineProfile={liff.profile}
            onRegisterSuccess={handleRegisterSuccess}
          />
      }
    </AppShell>
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
