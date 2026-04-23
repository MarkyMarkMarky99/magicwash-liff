import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getCustomerById } from '../api/customerApi';
import { lsClear } from '../api/localCache';
import { parseSheetDate } from '../api/dateUtils';
import { HeaderContext, NavigateContext } from '../App';
import BookingSheet from '../components/ui/BookingSheet';
import CustomerCard from '../components/customer-orders/CustomerCard';
import OrderList from '../components/customer-orders/OrderList';
import OrderDetailSheet from '../components/customer-orders/OrderDetailSheet';
import OrderGallery from './OrderGallery';

export default function CustomerOrders({ custId }) {
  const { t } = useTranslation();
  const [customer, setCustomer]               = useState(null);
  const [orders, setOrders]                   = useState([]);
  const [status, setStatus]                   = useState('loading');
  const [refreshing, setRefreshing]           = useState(false);
  const [galleryOrderId, setGalleryOrderId]   = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [sheetTop, setSheetTop]               = useState(null);
  const [bookingOpen, setBookingOpen]         = useState(false);
  const setOnBack      = useContext(HeaderContext);
  const navigate       = useContext(NavigateContext);
  const cardSectionRef = useRef(null);

  useEffect(() => {
    if (!custId) { setStatus('error'); return; }

    const applyCustomer = (res) => {
      setCustomer(res.data);
      setOrders([...(res.data.orders ?? [])].sort((a, b) => (parseSheetDate(b.date) ?? 0) - (parseSheetDate(a.date) ?? 0)));
    };

    getCustomerById(custId, (fresh) => {
      if (fresh.status === 'found') applyCustomer(fresh);
    })
      .then((res) => {
        if (res.status === 'found') { applyCustomer(res); setStatus('done'); }
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [custId]);

  // Double-wrap so React stores it as a value, not a functional updater.
  useEffect(() => {
    setOnBack(galleryOrderId ? () => () => setGalleryOrderId(null) : null);
  }, [galleryOrderId]);

  const handleRefresh = useCallback(async () => {
    if (!custId || refreshing) return;
    lsClear('mw_customer_id_' + custId);
    setRefreshing(true);
    try {
      const res = await getCustomerById(custId);
      if (res.status === 'found') {
        setCustomer(res.data);
        const sorted = [...(res.data.orders ?? [])].sort(
          (a, b) => (parseSheetDate(b.date) ?? 0) - (parseSheetDate(a.date) ?? 0)
        );
        sorted.forEach((o) => lsClear('mw_order_' + o.orderId));
        setOrders(sorted);
        setStatus('done');
      }
    } catch { /* silently fail */ }
    finally { setRefreshing(false); }
  }, [custId, refreshing]);

  const handleSelectOrder = (orderId) => {
    if (cardSectionRef.current) {
      setSheetTop(cardSectionRef.current.offsetTop + cardSectionRef.current.offsetHeight);
    } else {
      setSheetTop(null);
    }
    setSelectedOrderId(orderId);
  };

  const handleViewPhotosFromSheet = (orderId) => {
    setSelectedOrderId(null);
    setGalleryOrderId(orderId);
  };

  const bookingCustomer = customer ? {
    customerId:   customer.customerId,
    address:      customer.address,
    phone:        customer.phone,
    customerName: customer.customerName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
  } : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden font-body text-on-surface w-full">

      {/* Gallery view */}
      {galleryOrderId && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <OrderGallery orderId={galleryOrderId} onBack={() => setGalleryOrderId(null)} />
        </div>
      )}

      {/* Orders list view */}
      {!galleryOrderId && (
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
              <div ref={cardSectionRef} className="px-4 pt-4 pb-3 space-y-3">
                <CustomerCard customer={customer} />
                <button
                  onClick={() => setBookingOpen(true)}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 bg-primary text-on-primary font-headline font-bold text-[15px] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  {t('booking.bookAppointment')}
                </button>
              </div>
              <div className="flex-1">
                <OrderList
                  orders={orders}
                  onViewPhotos={setGalleryOrderId}
                  onSelectOrder={handleSelectOrder}
                  onRefresh={handleRefresh}
                  refreshing={refreshing}
                  onViewAll={() => navigate(`/?list&type=orders&custId=${custId}`)}
                />
              </div>
            </>
          )}

        </div>
      )}

      {/* Order detail sheet */}
      {selectedOrderId && !galleryOrderId && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          topOffset={sheetTop}
          onClose={() => setSelectedOrderId(null)}
          onViewPhotos={handleViewPhotosFromSheet}
        />
      )}

      {/* Book Appointment sheet */}
      <BookingSheet
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        customer={bookingCustomer}
      />

    </div>
  );
}
