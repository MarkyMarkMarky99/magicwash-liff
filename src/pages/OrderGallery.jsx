import { useState, useEffect, useRef } from 'react';
import { getPhotosByOrderId } from '../api/gvizApi';
import PageLayout from '../components/layout/PageLayout';

function GalleryImage({ src, alt, delay }) {
  const [activeSrc, setActiveSrc] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setActiveSrc(src), delay);
    return () => clearTimeout(timerRef.current);
  }, [src, delay]);

  if (!activeSrc) return <div className="w-full h-full bg-surface-variant animate-pulse" />;

  return (
    <img
      src={activeSrc}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
    />
  );
}

export default function OrderGallery({ orderId, onBack }) {
  const [photos, setPhotos]     = useState([]);
  const [status, setStatus]     = useState('loading');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!orderId) { setStatus('error'); return; }
    getPhotosByOrderId(orderId)
      .then((data) => {
        setPhotos(data);
        setStatus(data.length === 0 ? 'empty' : 'done');
      })
      .catch(() => setStatus('error'));
  }, [orderId]);

  // Photo grid / state screens — shared between embedded and standalone
  const body = (
    <div className="p-4 flex flex-col min-h-full">
      {status === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-primary text-5xl animate-pulse">local_laundry_service</span>
          <p className="font-body text-on-surface-variant text-sm">กำลังโหลดรูปภาพ…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-error text-5xl">error_outline</span>
          <p className="font-body text-on-surface-variant text-sm text-center">
            {orderId ? 'โหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'ไม่พบ Order ID ใน URL'}
          </p>
        </div>
      )}

      {status === 'empty' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
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
              <GalleryImage
                src={`${photo.imageUrl}=s200`}
                alt={photo.label || `รูปที่ ${i + 1}`}
                delay={i * 1000}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Lightbox — fixed positioning works in both embedded and standalone
  const lightboxEl = lightbox !== null && (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={() => setLightbox(null)}
    >
      <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>

      <img
        src={photos[lightbox].imageUrl}
        alt={photos[lightbox].label}
        className="max-w-full max-h-[80dvh] rounded-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {photos[lightbox].label && (
        <p className="mt-3 text-white/80 font-body text-sm text-center">{photos[lightbox].label}</p>
      )}

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
  );

  // Embedded mode (inside CustomerOrders): body only, no own PageLayout
  if (onBack) {
    return (
      <>
        {body}
        {lightboxEl}
      </>
    );
  }

  // Standalone mode (/?gallery&orderId=xxx): AppShell owns the container + header
  return (
    <>
      <PageLayout scrollable>
        {body}
      </PageLayout>
      {lightboxEl}
    </>
  );
}
