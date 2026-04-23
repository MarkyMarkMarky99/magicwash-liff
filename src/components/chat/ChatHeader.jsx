import { useState, useRef, useEffect } from 'react';

const MENU_ITEMS_TH = [
  { icon: 'receipt_long',   label: 'บิลของฉัน' },
  { icon: 'local_shipping', label: 'ข้อมูลจัดส่ง' },
  { icon: 'photo_library',  label: 'รูปถ่าย' },
  { icon: 'history',        label: 'ประวัติออเดอร์' },
  { icon: 'help_outline',   label: 'ช่วยเหลือ' },
];
const MENU_ITEMS_EN = [
  { icon: 'receipt_long',   label: 'My Bills' },
  { icon: 'local_shipping', label: 'Delivery Info' },
  { icon: 'photo_library',  label: 'Photos' },
  { icon: 'history',        label: 'Order History' },
  { icon: 'help_outline',   label: 'Help' },
];

export default function ChatHeader({ displayName, customerId, isTh, onClose, onMenuSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuItems = isTh ? MENU_ITEMS_TH : MENU_ITEMS_EN;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className="flex-none bg-primary px-4 py-3 flex items-center gap-3 shadow-md z-50 relative">
      <div className="w-9 h-9 rounded-full bg-primary-container/40 border border-on-primary/20 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined fill-icon text-on-primary text-[22px]">account_circle</span>
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-headline font-bold text-[15px] text-on-primary truncate leading-tight">{displayName}</h1>
        <p className="font-label text-[11px] text-on-primary/70">{customerId}</p>
      </div>

      {/* 3-dot menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-on-primary/80 hover:bg-on-primary/10 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">more_vert</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 w-44 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 overflow-hidden z-50">
            {menuItems.map((item, i) => (
              <button
                key={item.label}
                onClick={() => { setMenuOpen(false); onMenuSelect?.(item); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-container active:bg-surface-container-high transition-colors ${
                  i > 0 ? 'border-t border-outline-variant/10' : ''
                }`}
              >
                <span className="material-symbols-outlined text-primary text-[18px]">{item.icon}</span>
                <span className="font-body text-sm text-on-surface">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-on-primary/80 hover:bg-on-primary/10 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      )}
    </header>
  );
}
