import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getCustomerById } from '../api/customerApi';
import { getOrdersByCustomerId } from '../api/orderApi';
import { lsClear, cacheKey } from '../api/localCache';
import { HeaderContext } from '../App';
import CustomerCard from '../components/customer-orders/CustomerCard';
import OrderList from '../components/customer-orders/OrderList';
import OrderDetailSheet from '../components/customer-orders/OrderDetailSheet';
import OrderGallery from './OrderGallery';
import BookPickup from './BookPickup';

export default function CustomerOrders({ custId }) {
  const [customer, setCustomer]               = useState(null);
  const [orders, setOrders]                   = useState([]);
  const [status, setStatus]                   = useState('loading');
  const [refreshing, setRefreshing]           = useState(false);
  const [galleryOrderId, setGalleryOrderId]   = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [booking, setBooking]                 = useState(null); // { type: 'pickup'|'delivery', orderId: string|null }
  const [sheetTop, setSheetTop]               = useState(null);
  const { t } = useTranslation();
  const setOnBack      = useContext(HeaderContext);
  const cardSectionRef = useRef(null);

  useEffect(() => {
    if (!custId) { setStatus('error'); return; }

    Promise.all([
      getCustomerById(custId,       (fresh) => { if (fresh) setCustomer(fresh); }),
      getOrdersByCustomerId(custId, (fresh) => setOrders(fresh)),
    ])
      .then(([customerRes, ordersRes]) => {
        if (customerRes) setCustomer(customerRes);
        setOrders(ordersRes);
        setStatus(customerRes ? 'done' : 'error');
      })
      .catch(() => setStatus('error'));
  }, [custId]);

  useEffect(() => {
    if (galleryOrderId) {
      setOnBack(() => () => setGalleryOrderId(null));
    } else if (booking) {
      setOnBack(() => () => setBooking(null));
    } else {
      setOnBack(null);
    }
  }, [galleryOrderId, booking]);

  const handleRefresh = useCallback(async () => {
    if (!custId || refreshing) return;
    lsClear(cacheKey('customer', custId));
    lsClear(cacheKey('ordersView', custId));
    setRefreshing(true);
    try {
      const [customerRes, ordersRes] = await Promise.all([
        getCustomerById(custId),
        getOrdersByCustomerId(custId),
      ]);
      if (customerRes) setCustomer(customerRes);
      setOrders(ordersRes);
      setStatus('done');
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

      {/* Gallery view — embedded, no own header */}
      {galleryOrderId && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <OrderGallery orderId={galleryOrderId} onBack={() => setGalleryOrderId(null)} />
        </div>
      )}

      {/* Book pickup / delivery view — embedded, no own header */}
      {booking && !galleryOrderId && (
        <BookPickup userData={customer} type={booking.type} orderId={booking.orderId} />
      )}

      {/* Orders list view */}
      {!galleryOrderId && !booking && (
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
              <div ref={cardSectionRef} className="px-4 pt-4 pb-3 space-y-4">
                {/* Header — mirrors OrderInfoCard layout */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest mb-0.5">
                      {t('customerOrders.customerNo')}
                    </p>
                    <h2 className="font-headline font-bold text-[22px] text-on-surface leading-tight truncate">
                      {customer?.customerIndex && customer?.phone ? `${customer.customerIndex}-${String(customer.phone).slice(-4)}` : customer?.customerId || '–'}
                    </h2>
                  </div>
                  {customer?.customerType && (
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">
                        {t('customerOrders.type')}
                      </p>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary">
                        {customer.customerType}
                      </span>
                    </div>
                  )}
                </div>
                <CustomerCard
                  customer={customer}
                  onSchedule={handleShowBookPickup}
                />
              </div>
              <div className="flex-1">
                <OrderList
                  orders={orders}
                  onViewPhotos={setGalleryOrderId}
                  onSelectOrder={handleSelectOrder}
                  onRefresh={handleRefresh}
                  refreshing={refreshing}
                />
              </div>
            </>
          )}

        </div>
      )}

      {/* Order detail bottom sheet */}
      {selectedOrderId && !galleryOrderId && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          topOffset={sheetTop}
          onClose={() => setSelectedOrderId(null)}
          onViewPhotos={handleViewPhotosFromSheet}
          onScheduleDelivery={handleShowDelivery}
        />
      )}

    </div>
  );
}
