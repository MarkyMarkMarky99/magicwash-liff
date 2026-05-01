import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getOrderById } from '../../api/orderApi';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';

export default function OrderDetailSheet({ orderId, topOffset, onClose, onViewPhotos, onScheduleDelivery }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [visible, setVisible] = useState(false);
  const [itemsCollapsed, setItemsCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const latestDragOffsetRef = useRef(0);
  const sheetRef = useRef(null);

  // Trigger slide-up after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setStatus('loading');
    setOrder(null);
    getOrderById(orderId, (fresh) => {
      if (fresh) setOrder(fresh);
    })
      .then((res) => {
        if (res) { setOrder(res); setStatus('done'); }
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [orderId]);

  const handleClose = () => {
    setDragOffset(0);
    latestDragOffsetRef.current = 0;
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const handleDragStart = (event) => {
    if (!visible) return;
    dragStartYRef.current = event.clientY;
    latestDragOffsetRef.current = 0;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event) => {
    if (!dragging) return;
    const nextOffset = Math.max(0, event.clientY - dragStartYRef.current);
    latestDragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const handleDragEnd = (event) => {
    if (!dragging) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);

    const sheetHeight = sheetRef.current?.offsetHeight || 0;
    const closeThreshold = Math.max(80, sheetHeight * 0.18);

    if (latestDragOffsetRef.current >= closeThreshold) {
      handleClose();
    } else {
      latestDragOffsetRef.current = 0;
      setDragOffset(0);
    }
  };

  const sheetTop = topOffset != null ? `calc(${topOffset}px - 30%)` : '8%';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-30 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute inset-x-0 bottom-0 z-40 bg-surface rounded-t-2xl shadow-2xl flex flex-col ease-out ${dragging ? '' : 'transition-transform duration-300'}`}
        style={{
          top: sheetTop,
          transform: visible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-2 pb-0.5 flex-none cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className="w-9 h-1 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-4 pt-0.5 pb-2 flex-none border-b border-outline-variant/20 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className="min-w-0 flex-1">
            <p className="font-label text-[8px] text-on-surface-variant font-bold uppercase tracking-widest mb-0.5">{t('activeOrder.orderNumber')}</p>
            <h2 className="font-headline font-bold text-[18px] text-on-surface leading-tight truncate">{orderId}</h2>
          </div>
        </div>

        {/* Dates + view photos button — pinned below header, outside scroll */}
        {status === 'done' && order && (
          <div className="px-4 pt-3 pb-2 flex-none space-y-3">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 bg-surface-container-low rounded-xl px-3 py-2.5">
                <p className="font-label text-[9px] text-on-surface-variant uppercase tracking-wide mb-1">{t('activeOrder.receivedDate')}</p>
                <p className="font-headline font-bold text-[13px] text-on-surface leading-tight">{formatDisplayDate(order.receivedDate, undefined, dateLocale)}</p>
              </div>
              <div className="flex items-center px-1">
                <span className="material-symbols-outlined text-outline text-[16px] leading-none">arrow_forward</span>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-xl px-3 py-2.5">
                <p className="font-label text-[9px] text-on-surface-variant uppercase tracking-wide mb-1">{t('activeOrder.dueDate')}</p>
                <p className="font-headline font-bold text-[13px] text-on-surface leading-tight">{formatDisplayDate(order.dueDate, undefined, dateLocale)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onScheduleDelivery?.(orderId)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] font-label text-[12px] font-semibold transition-all"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">local_shipping</span>
                {t('activeOrder.delivery.schedule')}
              </button>
              <button
                onClick={() => onViewPhotos?.(orderId)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] font-label text-[12px] font-semibold transition-all"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">photo_library</span>
                {t('customerOrders.viewPhotos')}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">

          {status === 'loading' && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl animate-pulse">local_laundry_service</span>
              <p className="font-body text-on-surface-variant text-sm">{t('loading')}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-error text-4xl">error_outline</span>
              <p className="font-body text-on-surface-variant text-sm">{t('customerOrders.loadError')}</p>
            </div>
          )}

          {status === 'done' && order && (
            <div className="px-4 py-4 space-y-4">

              {/* Items list */}
              {order.items?.length > 0 && (
                <section className="bg-white w-full rounded-2xl overflow-hidden">
                  <div
                    className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setItemsCollapsed(!itemsCollapsed)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">checkroom</span>
                      <h2 className="font-headline font-bold text-[13px] tracking-tight">{t('activeOrder.items.title')}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-surface-container rounded-full px-2.5 h-[22px]">
                        <span className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
                          {order.quantity || 0} {t('activeOrder.pieces')}
                        </span>
                      </div>
                      <span className={`material-symbols-outlined text-primary text-[16px] transition-transform ${itemsCollapsed ? '' : 'rotate-180'}`}>
                        expand_more
                      </span>
                    </div>
                  </div>
                  {!itemsCollapsed && (
                    <ul className="divide-y divide-outline-variant/10">
                      {order.items.map((item) => (
                        <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-sm text-on-surface font-medium leading-tight truncate">
                              {item.description || '—'}
                            </p>
                            {item.service_type && (
                              <p className="font-body text-[11px] text-on-surface-variant mt-0.5">{item.service_type}</p>
                            )}
                          </div>
                          <span className="font-label text-[11px] font-semibold text-on-surface-variant shrink-0">
                            {item.quantity} {t('activeOrder.pieces')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/* Note */}
              {order.note && (
                <div className="flex items-start gap-2 bg-surface-container-low rounded-xl px-3 py-2.5">
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px] leading-none mt-0.5 shrink-0">edit_note</span>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">{order.note}</p>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
