import { useState, useEffect } from 'react';
import { getOrderById } from '../../api/orderApi';
import { formatDisplayDate } from '../../api/dateUtils';

export default function OrderDetailSheet({ orderId, topOffset, onClose, onViewPhotos }) {
  const [order, setOrder]   = useState(null);
  const [status, setStatus] = useState('loading');
  const [visible, setVisible] = useState(false);

  // Trigger slide-up after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setStatus('loading');
    setOrder(null);
    getOrderById(orderId, (fresh) => {
      if (fresh.status === 'found') setOrder(fresh.data);
    })
      .then((res) => {
        if (res.status === 'found') { setOrder(res.data); setStatus('done'); }
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [orderId]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const sheetTop = topOffset != null ? `${topOffset}px` : '38%';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-30 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`absolute inset-x-0 bottom-0 z-40 bg-surface rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ top: sheetTop }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-none">
          <div className="w-9 h-1 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-1 pb-3 flex-none border-b border-outline-variant/20">
          <div>
            <p className="type-overline text-on-surface-variant mb-0.5">รายละเอียดออเดอร์</p>
            <h2 className="type-btn text-on-surface leading-tight">{orderId}</h2>
          </div>
          {status === 'done' && order && (
            <div className="flex flex-col items-end gap-1 pt-0.5">
              {order.service_type && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label text-[10px] font-semibold">
                  <span className="material-symbols-outlined text-[11px] leading-none">speed</span>
                  {order.service_type}
                </span>
              )}
              {order.quantity > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label text-[10px] font-semibold">
                  <span className="material-symbols-outlined text-[11px] leading-none">straighten</span>
                  {order.quantity} ชิ้น
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dates + view photos button — pinned below header, outside scroll */}
        {status === 'done' && order && (
          <div className="px-4 pt-3 pb-2 flex-none space-y-3">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 bg-surface-container-low rounded-xl px-3 py-2.5">
                <p className="type-overline text-on-surface-variant mb-1">รับผ้า</p>
                <p className="font-headline font-bold text-[13px] text-on-surface leading-tight">{formatDisplayDate(order.received_date)}</p>
              </div>
              <div className="flex items-center px-1">
                <span className="material-symbols-outlined text-outline text-[16px] leading-none">arrow_forward</span>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-xl px-3 py-2.5">
                <p className="type-overline text-on-surface-variant mb-1">กำหนดส่ง</p>
                <p className="font-headline font-bold text-[13px] text-on-surface leading-tight">{formatDisplayDate(order.due_date)}</p>
              </div>
            </div>
            <button
              onClick={() => onViewPhotos?.(orderId)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/15 active:scale-[0.98] font-label text-[12px] font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">photo_library</span>
              ดูรูปภาพทั้งหมด
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">

          {status === 'loading' && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl animate-pulse">local_laundry_service</span>
              <p className="font-body text-on-surface-variant text-sm">กำลังโหลด…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-error text-4xl">error_outline</span>
              <p className="font-body text-on-surface-variant text-sm">โหลดข้อมูลไม่สำเร็จ</p>
            </div>
          )}

          {status === 'done' && order && (
            <div className="px-4 py-4 space-y-4">

              {/* Items list */}
              {order.items?.length > 0 && (
                <div>
                  <p className="font-label text-[10px] text-primary font-bold uppercase tracking-widest mb-2">รายการ</p>
                  <div className="space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="bg-surface-container-low rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-on-surface font-medium leading-tight truncate">
                            {item.description || '—'}
                          </p>
                          {item.service_type && (
                            <p className="font-body text-[10px] text-on-surface-variant mt-0.5">{item.service_type}</p>
                          )}
                        </div>
                        <span className="font-label text-[11px] font-semibold text-on-surface-variant shrink-0">
                          {item.quantity} ชิ้น
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
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
