import { useState, useEffect, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiff } from './hooks/useLiff';
import { useRoute } from './hooks/useRoute';
import { getCustomerByLineId, getCustomerById } from './api/customerApi';
import { parseSheetDate } from './api/dateUtils';
import RegisterCustomerV2 from './pages/RegisterCustomerV2';
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

/** Client-side navigate function — use instead of window.location.href to avoid full reloads. */
export const NavigateContext = createContext(null);

/**
 * Shared app shell — renders the single header used by every page.
 * Pages that need a back button call setOnBack (from HeaderContext).
 */
function AppShell({ navigate, children }) {
  const [onBack, setOnBack] = useState(null);

  return (
    <div id="app-shell" className="w-full sm:max-w-[440px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
      <div className="absolute top-3 right-4 z-[60]">
        <LanguageSwitcher />
      </div>
      <header className="flex-none bg-primary text-on-primary px-4 py-3 flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-1">
          {onBack && (
            <button
              onClick={onBack}
              className="text-on-primary -ml-1.5 mr-0.5 h-7 flex items-center px-1 hover:opacity-70 active:scale-[0.98] transition-all focus:outline-none"
            >
              <span className="material-symbols-outlined text-[22px] leading-none">arrow_back</span>
            </button>
          )}
          <h1 className="text-lg font-headline font-bold tracking-tight flex items-center gap-2">
            <img src="/logo.png" alt="logo" className="h-7 w-7 rounded-full object-cover" />
            Magicwash Laundry
          </h1>
        </div>
      </header>

      <NavigateContext.Provider value={navigate}>
        <HeaderContext.Provider value={setOnBack}>
          {children}
        </HeaderContext.Provider>
      </NavigateContext.Provider>
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
  const { params, navigate } = useRoute();

  // --- DEV: RegisterCustomerV2 preview ---
  // URL: /?regv2
  if (params.has('regv2')) {
    return (
      <div id="app-shell" className="w-full sm:max-w-[440px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
        <div className="absolute top-3 right-4 z-[60]">
          <LanguageSwitcher />
        </div>
        <RegisterCustomerV2
          onRegisterSuccess={(data) => navigate(`/?orders&custId=${data.customerId}`)}
          lineProfile={null}
        />
      </div>
    );
  }

  // --- Generic list route: standalone, no LIFF ---
  // URL: /?list&type=orders&custId=CUS-12345
  if (params.has('list')) {
    const cfg = LIST_CONFIG[params.get('type')];
    if (cfg) {
      return (
        <AppShell navigate={navigate}>
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
      <AppShell navigate={navigate}>
        <OrderGallery orderId={params.get('orderId')} />
      </AppShell>
    );
  }

  // --- Customer orders route: standalone, no LIFF ---
  // URL: /?orders&custId=CUS-12345
  if (params.has('orders')) {
    return (
      <AppShell navigate={navigate}>
        <CustomerOrders custId={params.get('custId')} />
      </AppShell>
    );
  }

  return <AppMain />;
}

function AppMain() {
  const { navigate } = useRoute();
  const liff = useLiff();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (liff.status === 'loading') return;

    // Legacy ?custId=xxx — redirect straight to orders page
    const custId = new URLSearchParams(window.location.search).get('custId');
    if (custId) { navigate(`/?orders&custId=${custId}`); return; }

    // Inside LINE — try auto-login by LINE userId
    if (liff.status === 'ready') {
      getCustomerByLineId(liff.profile.userId)
        .then((res) => {
          if (res.status === 'found') navigate(`/?orders&custId=${res.data.customerId}`);
          else setReady(true);
        })
        .catch(() => setReady(true));
      return;
    }

    // Normal browser — show register/login gate
    if (liff.status === 'no-line') setReady(true);
  }, [liff.status]);

  // Dev preview: ?dev=chat
  const devParam = new URLSearchParams(window.location.search).get('dev');
  if (devParam === 'chat') {
    const dummyUser = { customerName: 'บุสรินทร์ หอมวิเชียร (โบ)', customerId: 'CUS-88291', phone: '081-234-5678', address: '123 ถนนสุขุมวิท, กรุงเทพฯ' };
    return (
      <div className="w-full sm:max-w-[440px] mx-auto bg-surface h-dvh flex flex-col relative sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
        <OrderChat userData={dummyUser} appointmentDate="2026-04-05" appointmentTime="10:00 - 12:00 น." />
      </div>
    );
  }

  if (!ready || liff.status === 'loading') return <SplashScreen />;

  return (
    <AppShell navigate={navigate}>
      <RegisterCustomerV2
        lineProfile={liff.profile}
        onRegisterSuccess={(data) => navigate(`/?orders&custId=${data.customerId}`)}
      />
    </AppShell>
  );
}

function SplashScreen() {
  const { t } = useTranslation();
  return (
    <div className="w-full sm:max-w-[440px] mx-auto bg-surface h-dvh flex flex-col items-center justify-center gap-4">
      <span className="material-symbols-outlined text-primary text-[56px] animate-pulse">local_laundry_service</span>
      <p className="font-body text-on-surface-variant text-sm">{t('loading')}</p>
    </div>
  );
}
