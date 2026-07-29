import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getCustomerById } from '../api/customerApi';
import { getOrdersByCustomerId, mergeOrdersWithInvoices } from '../api/orderApi';
import { getInvoicesByCustomerId } from '../api/gvizApi';
import { getWaitingPickups, clearAppointmentsCache } from '../api/appointmentApi';
import { lsClear, cacheKey } from '../api/localCache';
import { HeaderContext } from '../App';
import OrderList from '../components/customer-orders/OrderList';
import OrderDetailSheet from '../components/customer-orders/OrderDetailSheet';
import CustomerDetailsCard from '../components/ui/CustomerDetailsCard';
import PageActionFooter from '../components/ui/PageActionFooter';
import OrderGallery from './OrderGallery';
import BookPickup from './BookPickup';
import InvoicePreview from './InvoicePreview';

export default function CustomerOrders({ custId }) {
  const [customer, setCustomer]               = useState(null);
  const [rawOrders, setRawOrders]              = useState([]);
  const [invoices, setInvoices]                = useState([]);
  const orders = useMemo(() => mergeOrdersWithInvoices(rawOrders, invoices), [rawOrders, invoices]);
  const [status, setStatus]                   = useState('loading');
  const [refreshing, setRefreshing]           = useState(false);
  const [galleryOrderId, setGalleryOrderId]   = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [invoicePreview, setInvoicePreview]   = useState(null); // { invoiceNumber, origin, orderId? }
  const [booking, setBooking]                 = useState(null); // { type: 'pickup'|'delivery', orderId: string|null }
  const [bookingBusy, setBookingBusy]         = useState(false); // true while a booking POST is in flight
  const [waitingPickups, setWaitingPickups]   = useState([]);    // upcoming active pickups (from Appointments)
  const { t } = useTranslation();
  const setOnBack = useContext(HeaderContext);
  const customerNumber = customer?.customerIndex && customer?.phone
    ? `${customer.customerIndex}-${String(customer.phone).slice(-4)}`
    : customer?.customerId || '–';

  const loadWaitingPickups = useCallback((id = custId) => {
    if (!id) return;
    getWaitingPickups(id, (fresh) => setWaitingPickups(fresh))
      .then((res) => setWaitingPickups(res))
      .catch(() => { /* display-only, ignore */ });
  }, [custId]);

  const loadInvoices = useCallback((id = custId) => {
    if (!id) return;
    getInvoicesByCustomerId(id, (fresh) => setInvoices(fresh))
      .then((res) => setInvoices(res))
      .catch(() => { /* enrichment-only, ignore */ });
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

    loadWaitingPickups(custId);
    loadInvoices(custId);
  }, [custId, loadWaitingPickups, loadInvoices]);

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
    lsClear(cacheKey('invoiceViewByCustomer', custId));
    clearAppointmentsCache(custId);
    setRefreshing(true);
    try {
      const [customerRes, ordersRes, invoicesRes] = await Promise.all([
        getCustomerById(custId),
        getOrdersByCustomerId(custId),
        getInvoicesByCustomerId(custId),
      ]);
      if (customerRes) setCustomer(customerRes);
      setRawOrders(ordersRes);
      setInvoices(invoicesRes);
      loadWaitingPickups(custId);
      setStatus('done');
    } catch { /* silently fail */ }
    finally { setRefreshing(false); }
  }, [custId, refreshing, loadWaitingPickups]);

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
          onDone={() => { setBooking(null); loadWaitingPickups(custId); }}
        />
      )}

      {/* Orders list view */}
      {!invoicePreview && !galleryOrderId && !booking && (
        <>
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">

            {status === 'loading' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-primary text-5xl animate-pulse">local_laundry_service</span>
                <p className="font-body text-on-surface-variant text-sm">กำลังโหลดข้อมูล…</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-error text-5xl">error_outline</span>
                <p className="font-body text-on-surface-variant text-sm text-center">
                  {custId ? 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'ไม่พบ Customer ID ใน URL'}
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
                <div className="flex-1 px-4 pb-6">
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
                </div>
              </>
            )}
          </div>
          {status === 'done' && !selectedOrderId && (
            <PageActionFooter
              icon="event"
              label={t('customerOrders.schedulePickup')}
              onClick={handleShowBookPickup}
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
