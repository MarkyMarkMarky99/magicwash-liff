import { useState, useEffect, useContext, useRef } from 'react';
import { getCustomerById } from '../api/customerApi';
import { HeaderContext } from '../App';
import CustomerCard from '../components/customer-orders/CustomerCard';
import OrderList from '../components/customer-orders/OrderList';
import OrderDetailSheet from '../components/customer-orders/OrderDetailSheet';
import OrderGallery from './OrderGallery';

export default function CustomerOrders({ custId }) {
  const [customer, setCustomer]             = useState(null);
  const [orders, setOrders]                 = useState([]);
  const [status, setStatus]                 = useState('loading');
  const [galleryOrderId, setGalleryOrderId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [sheetTop, setSheetTop]             = useState(null);
  const setOnBack   = useContext(HeaderContext);
  const cardSectionRef = useRef(null);

  useEffect(() => {
    if (!custId) { setStatus('error'); return; }

    getCustomerById(custId)
      .then((res) => {
        if (res.status === 'found') {
          setCustomer(res.data);
          const sorted = [...(res.data.orders ?? [])].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          setOrders(sorted);
          setStatus('done');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [custId]);

  // Sync back button in the shared header whenever gallery view toggles.
  // Double-wrap the function so React stores it as a value, not a functional updater.
  useEffect(() => {
    setOnBack(galleryOrderId ? () => () => setGalleryOrderId(null) : null);
  }, [galleryOrderId]);

  const handleSelectOrder = (orderId) => {
    // offsetTop + offsetHeight gives layout position relative to the positioned wrapper,
    // unaffected by how far the user has scrolled inside the inner scrollable div.
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

  return (
    <div
      className="flex-1 min-h-0 flex flex-col relative overflow-hidden font-body text-on-surface w-full"
    >

      {/* Gallery view — embedded, no own header */}
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
              <div ref={cardSectionRef} className="px-4 pt-4 pb-3">
                <CustomerCard customer={customer} />
              </div>
              <div className="flex-1">
                <OrderList
                  orders={orders}
                  onViewPhotos={setGalleryOrderId}
                  onSelectOrder={handleSelectOrder}
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
        />
      )}

    </div>
  );
}
