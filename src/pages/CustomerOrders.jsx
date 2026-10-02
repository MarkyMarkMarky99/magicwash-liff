import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getCustomerById } from '../api/customerApi';
import { getOrdersByCustomerId, mergeOrdersWithInvoices } from '../api/orderApi';
import { getCustomerInvoices, invalidateCustomerInvoicesAfterPayment } from '../api/customerInvoices';
import { getCustomerAppointments, filterWaitingPickups, filterAppointmentHistory, clearAppointmentsCache } from '../api/appointmentApi';
import { lsClear, cacheKey } from '../api/localCache';
import { HeaderContext } from '../App';
import OrderList from '../components/customer-orders/OrderList';
import OrderDetailSheet from '../components/customer-orders/OrderDetailSheet';
import CustomerDetailsCard from '../components/ui/CustomerDetailsCard';
import BottomNavBar from '../components/ui/BottomNavBar';
import CustomerSectionIcon from '../components/customer-orders/CustomerSectionIcon';
import CustomerInvoiceList from '../components/customer-orders/CustomerInvoiceList';
import AppointmentHistoryList from '../components/customer-orders/AppointmentHistoryList';
import SectionCard from '../components/ui/SectionCard';
import OrderGallery from './OrderGallery';
import BookPickup from './BookPickup';
import InvoicePreview from './InvoicePreview';

export default function CustomerOrders({ custId }) {
  const [customer, setCustomer]               = useState(null);
  const [rawOrders, setRawOrders]              = useState([]);
  const [invoices, setInvoices]                = useState([]);
  const [invoiceStatus, setInvoiceStatus]      = useState('loading');
  const invoiceRequestId = useRef(0);
  const [activeSection, setActiveSection]      = useState('orders');
  const [appointmentStatus, setAppointmentStatus] = useState('loading');
  const orders = useMemo(() => mergeOrdersWithInvoices(rawOrders, invoices), [rawOrders, invoices]);
  const [status, setStatus]                   = useState('loading');
  const [refreshing, setRefreshing]           = useState(false);
  const [galleryOrderId, setGalleryOrderId]   = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [invoicePreview, setInvoicePreview]   = useState(null); // { invoiceNumber, origin, orderId? }
  const [booking, setBooking]                 = useState(null); // { type: 'pickup'|'delivery', orderId: string|null }
  const [bookingBusy, setBookingBusy]         = useState(false); // true while a booking POST is in flight
  const [appointments, setAppointments]       = useState([]);
  const waitingPickups = useMemo(() => filterWaitingPickups(appointments), [appointments]);
  const appointmentHistory = useMemo(() => filterAppointmentHistory(appointments), [appointments]);
  const { t } = useTranslation();
  const setOnBack = useContext(HeaderContext);
  const sectionItems = ['orders', 'packages', 'invoices', 'appointments'].map((key) => ({
    key,
    label: t(`customerOrders.sections.${key}`),
  }));
  const customerNumber = customer?.customerIndex && customer?.phone
    ? `${customer.customerIndex}-${String(customer.phone).slice(-4)}`
    : customer?.customerId || '–';

  const loadAppointments = useCallback((id = custId) => {
    if (!id) return;
    setAppointmentStatus((current) => current === 'loading' ? current : 'refreshing');
    return getCustomerAppointments(id, (fresh) => setAppointments(fresh))
      .then((res) => { setAppointments(res); setAppointmentStatus('done'); })
      .catch(() => setAppointmentStatus('error'));
  }, [custId]);

  const handleRefreshAppointments = useCallback(() => {
    clearAppointmentsCache(custId);
    return loadAppointments(custId);
  }, [custId, loadAppointments]);

  const loadInvoices = useCallback((id = custId, options) => {
    if (!id) return;
    const requestId = ++invoiceRequestId.current;
    setInvoiceStatus((current) => current === 'loading' ? current : 'refreshing');
    return getCustomerInvoices(id, (fresh) => {
      if (requestId === invoiceRequestId.current) setInvoices(fresh);
    }, options)
      .then((res) => {
        if (requestId !== invoiceRequestId.current) return;
        setInvoices(res);
        setInvoiceStatus('done');
      })
      .catch(() => {
        if (requestId === invoiceRequestId.current) setInvoiceStatus('error');
      });
  }, [custId]);

  useEffect(() => {
    if (!custId) { setStatus('error'); return; }

    Promise.all([
      getCustomerById(custId,       (fresh) => { if (fresh) setCustomer(fresh); }),
      getOrdersByCustomerId(custId, (fresh) => setRawOrders(fresh)),
    ])
      .then(([customerRes, ordersRes]) => {
        if (customerRes) setCustomer(customerRes);
        setRawOrders(ordersRes);
        setStatus(customerRes ? 'done' : 'error');
      })
      .catch(() => setStatus('error'));

    loadAppointments(custId);
    loadInvoices(custId);
  }, [custId, loadAppointments, loadInvoices]);

  useEffect(() => {
    if (invoicePreview) return;
    if (bookingBusy) {
      // Lock navigation while a booking write is in flight (prevents back → reopen → resubmit).
      setOnBack(null);
    } else if (galleryOrderId) {
      setOnBack(() => () => setGalleryOrderId(null));
    } else if (booking) {
      setOnBack(() => () => setBooking(null));
    } else {
      setOnBack(null);
    }
  }, [galleryOrderId, booking, bookingBusy, invoicePreview, setOnBack]);

  const handleRefresh = useCallback(async () => {
    if (!custId || refreshing) return;
    lsClear(cacheKey('customer', custId));
    lsClear(cacheKey('ordersViewV3', custId));
    clearAppointmentsCache(custId);
    setRefreshing(true);
    try {
      const [customerRes, ordersRes] = await Promise.all([
        getCustomerById(custId),
        getOrdersByCustomerId(custId),
        loadInvoices(custId, { refresh: true }),
      ]);
      if (customerRes) setCustomer(customerRes);
      setRawOrders(ordersRes);

      loadAppointments(custId);
      setStatus('done');
    } catch { /* silently fail */ }
    finally { setRefreshing(false); }
  }, [custId, refreshing, loadAppointments, loadInvoices]);

  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId);
  };

  const handleShowInvoiceFromList = useCallback((invoiceNumber) => {
    setInvoicePreview({ invoiceNumber, origin: 'list' });
  }, []);

  const handleShowInvoiceFromDetail = useCallback((invoiceNumber, orderId) => {
    if (!orderId) return;
    setSelectedOrderId(null);
    setInvoicePreview({ invoiceNumber, origin: 'detail', orderId });
  }, []);

  const handleInvoiceBack = useCallback(() => {
    if (invoicePreview?.origin === 'detail') {
      setSelectedOrderId(invoicePreview.orderId);
    }
    setInvoicePreview(null);
  }, [invoicePreview]);

  const handlePaymentRecorded = useCallback((outcome) => {
    if (invalidateCustomerInvoicesAfterPayment(custId, outcome)) {
      loadInvoices(custId, { refresh: true });
    }
  }, [custId, loadInvoices]);

  const handleViewPhotosFromSheet = (orderId) => {
    setSelectedOrderId(null);
    setGalleryOrderId(orderId);
  };

  const handleShowBookPickup = () => {
    setSelectedOrderId(null);
    setBooking({ type: 'pickup', orderId: null });
  };

  const handleShowDelivery = (orderId) => {
    setSelectedOrderId(null);
    setBooking({ type: 'delivery', orderId });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden font-body text-on-surface w-full">

      {invoicePreview && (
        <InvoicePreview
          key={invoicePreview.invoiceNumber}
          invoiceNumber={invoicePreview.invoiceNumber}
          onBack={handleInvoiceBack}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}

      {/* Gallery view — embedded, no own header */}
      {!invoicePreview && galleryOrderId && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <OrderGallery orderId={galleryOrderId} onBack={() => setGalleryOrderId(null)} />
        </div>
      )}

      {/* Book pickup / delivery view — embedded, no own header */}
      {!invoicePreview && booking && !galleryOrderId && (
        <BookPickup
          userData={customer}
          type={booking.type}
          orderId={booking.orderId}
          onBusyChange={setBookingBusy}
          onDone={() => { setBooking(null); loadAppointments(custId); }}
        />
      )}

      {/* Customer sections */}
      {!invoicePreview && !galleryOrderId && !booking && (
        <>
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">

            {status === 'loading' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-primary text-5xl animate-pulse">local_laundry_service</span>
                <p className="font-body text-on-surface-variant text-sm">{t('loading')}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-error text-5xl">error_outline</span>
                <p className="font-body text-on-surface-variant text-sm text-center">
                  {t(custId ? 'customerOrders.customerLoadError' : 'customerOrders.missingCustomerId')}
                </p>
              </div>
            )}

            {status === 'done' && (
              <>
                <div className="px-4 pt-4 pb-3 space-y-4">
                  <CustomerDetailsCard
                    label={t('activeOrder.customer.details')}
                    customer={customer}
                    customerCodeLabel={t('customerOrders.customerNo')}
                    customerCode={customerNumber}
                    customerType={customer?.customerType}
                  />
                </div>
                <div className="flex-1 px-4 pb-14 space-y-4">
                  {(activeSection === 'orders' || activeSection === 'appointments') && (
                    <button
                      type="button"
                      onClick={handleShowBookPickup}
                      className="w-full h-12 rounded-2xl px-4 flex items-center justify-center gap-2 bg-primary text-on-primary font-headline font-bold text-sm shadow-sm hover:opacity-95 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">event</span>
                      {t('customerOrders.schedulePickup')}
                    </button>
                  )}
                  {activeSection === 'orders' && (
                    <OrderList
                      orders={orders}
                      waitingPickups={waitingPickups}
                      onViewPhotos={setGalleryOrderId}
                      onSelectOrder={handleSelectOrder}
                      onViewInvoice={handleShowInvoiceFromList}
                      onPayNow={handleShowInvoiceFromList}
                      onRefresh={handleRefresh}
                      refreshing={refreshing}
                    />
                  )}
                  {activeSection === 'invoices' && (
                    <CustomerInvoiceList
                      invoices={invoices}
                      status={invoiceStatus}
                      onRetry={() => loadInvoices(custId, { refresh: true })}
                      onViewInvoice={handleShowInvoiceFromList}
                    />
                  )}
                  {activeSection === 'appointments' && (
                    <AppointmentHistoryList
                      appointments={appointmentHistory}
                      status={appointmentStatus}
                      onRefresh={handleRefreshAppointments}
                    />
                  )}
                  {activeSection === 'packages' && (
                    <SectionCard icon="confirmation_number" title={t('customerOrders.sections.packages')}>
                      <p className="px-4 py-4 text-sm text-on-surface-variant">{t('customerOrders.packagesUnavailable')}</p>
                    </SectionCard>
                  )}
                </div>
              </>
            )}
          </div>
          {status === 'done' && !selectedOrderId && (
            <BottomNavBar
              items={sectionItems}
              activeKey={activeSection}
              ariaLabel={t('customerOrders.sectionsLabel')}
              onSelect={setActiveSection}
              renderIcon={(item) => <CustomerSectionIcon name={item.key} />}
            />
          )}
        </>
      )}

      {/* Order detail bottom sheet */}
      {!invoicePreview && selectedOrderId && !galleryOrderId && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onViewPhotos={handleViewPhotosFromSheet}
          onViewInvoice={handleShowInvoiceFromDetail}
          onScheduleDelivery={handleShowDelivery}
        />
      )}

    </div>
  );
}
