import { useState, useEffect } from 'react';
import { getPhotosByOrderId } from '../api/gvizApi';
import PageLayout from '../components/layout/PageLayout';

export default function OrderGallery({ orderId }) {
  const [photos, setPhotos]   = useState([]);
  const [status, setStatus]   = useState('loading'); // 'loading' | 'empty' | 'done' | 'error'
  const [lightbox, setLightbox] = useState(null);    // index of open image

  useEffect(() => {
    if (!orderId) { setStatus('error'); return; }
    getPhotosByOrderId(orderId)
      .then((data) => {
        setPhotos(data);
        setStatus(data.length === 0 ? 'empty' : 'done');
      })
      .catch(() => setStatus('error'));
  }, [orderId]);

  return (
    <div className="w-full sm:max-w-[390px] mx-auto bg-surface h-dvh flex flex-col sm:border-x sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
      <PageLayout title={<span className="flex items-center gap-2"><img src="/logo.png" alt="logo" className="h-7 w-7 rounded-full object-cover" />Magicwash Laundry</span>} scrollable>
      <div className="p-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="material-symbols-outlined text-primary text-5xl animate-pulse">local_laundry_service</span>
            <p className="font-body text-on-surface-variant text-sm">กำลังโหลดรูปภาพ…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="material-symbols-outlined text-error text-5xl">error_outline</span>
            <p className="font-body text-on-surface-variant text-sm text-center">
              {orderId ? 'โหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'ไม่พบ Order ID ใน URL'}
            </p>
          </div>
        )}

        {status === 'empty' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="material-symbols-outlined text-on-surface-variant text-5xl">image_not_supported</span>
            <p className="font-body text-on-surface-variant text-sm">ยังไม่มีรูปภาพสำหรับออเดอร์นี้</p>
          </div>
        )}

        {status === 'done' && (
          <div className="grid grid-cols-3 gap-1">
            {photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setLightbox(i)}
                className="rounded-lg overflow-hidden bg-surface-variant aspect-square focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.label || `รูปที่ ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      </PageLayout>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white"
            onClick={() => setLightbox(null)}
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          <img
            src={photos[lightbox].imageUrl}
            alt={photos[lightbox].label}
            className="max-w-full max-h-[80dvh] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {photos[lightbox].label && (
            <p className="mt-3 text-white/80 font-body text-sm text-center">
              {photos[lightbox].label}
            </p>
          )}

          {/* Prev / Next */}
          <div className="flex gap-6 mt-4">
            <button
              disabled={lightbox === 0}
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
              className="text-white disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-3xl">chevron_left</span>
            </button>
            <span className="text-white/60 font-body text-sm self-center">
              {lightbox + 1} / {photos.length}
            </span>
            <button
              disabled={lightbox === photos.length - 1}
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
              className="text-white disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
