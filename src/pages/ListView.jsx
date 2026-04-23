import { useState, useEffect, useContext } from 'react';
import { HeaderContext, NavigateContext } from '../App';

/**
 * Generic full-page list view.
 *
 * Config shape (passed as individual props from App.jsx LIST_CONFIG):
 *   title        {string}    Page/section heading
 *   icon         {string}    Material Symbols icon name
 *   fetchFn      {fn}        async () => { status, data }
 *   getItems     {fn}        (data) => array of items
 *   sortFn       {fn}        optional (a, b) => number
 *   renderItem   {fn}        (item, { onOpenDetail, onOpenGallery }) => ReactNode
 *   renderDetail {fn}        optional (id, { onClose, onOpenGallery }) => ReactNode
 *   renderGallery{fn}        optional (id, { onBack }) => ReactNode
 *   emptyText    {string}
 *   backUrl      {string}    URL for the header back button
 */
export default function ListView({
  title,
  icon,
  fetchFn,
  getItems,
  sortFn,
  renderItem,
  renderDetail,
  renderGallery,
  emptyText = 'ไม่มีข้อมูล',
  backUrl,
}) {
  const [items, setItems]         = useState([]);
  const [status, setStatus]       = useState('loading');
  const [detailId, setDetailId]   = useState(null);
  const [galleryId, setGalleryId] = useState(null);
  const setOnBack  = useContext(HeaderContext);
  const navigate   = useContext(NavigateContext);

  // Sync back button: gallery → close gallery | default → backUrl
  useEffect(() => {
    if (galleryId && renderGallery) {
      setOnBack(() => () => setGalleryId(null));
    } else if (backUrl) {
      setOnBack(() => () => navigate(backUrl));
    } else {
      setOnBack(null);
    }
    return () => setOnBack(null);
  }, [galleryId, backUrl]);

  useEffect(() => {
    fetchFn()
      .then((res) => {
        if (res.status === 'found') {
          let arr = getItems(res.data) ?? [];
          if (sortFn) arr = [...arr].sort(sortFn);
          setItems(arr);
          setStatus('done');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  const handleOpenGallery = (id) => {
    setDetailId(null);
    setGalleryId(id);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden font-body text-on-surface w-full">

      {/* Gallery overlay */}
      {galleryId && renderGallery && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {renderGallery(galleryId, { onBack: () => setGalleryId(null) })}
        </div>
      )}

      {/* Main list */}
      {!galleryId && (
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
              <p className="font-body text-on-surface-variant text-sm text-center">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
            </div>
          )}

          {status === 'done' && (
            <>
              {/* Header bar */}
              <div className="px-4 py-2 bg-surface-container-low flex items-center gap-2.5 shrink-0">
                <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
                <h2 className="type-section-header text-primary">{title}</h2>
                <div className="ml-auto flex items-center gap-1.5 bg-surface-container rounded-full px-2.5 h-[22px]">
                  <span className="type-overline text-on-surface-variant">
                    {items.length} รายการ
                  </span>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="px-6 py-4 text-sm text-on-surface-variant italic">{emptyText}</p>
              ) : (
                <div className="divide-y divide-outline-variant/10 bg-surface-container-lowest">
                  {items.map((item, i) =>
                    renderItem(item, {
                      onOpenDetail: setDetailId,
                      onOpenGallery: handleOpenGallery,
                      index: i,
                    })
                  )}
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* Detail overlay (e.g. bottom sheet) */}
      {detailId && !galleryId && renderDetail && (
        renderDetail(detailId, {
          onClose: () => setDetailId(null),
          onOpenGallery: handleOpenGallery,
        })
      )}

    </div>
  );
}
