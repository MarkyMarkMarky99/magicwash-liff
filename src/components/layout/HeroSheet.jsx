import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Full-screen overlay with two animated panels:
 *   - Green hero panel slides DOWN from the top (rounded bottom corners)
 *   - White content panel slides UP from the bottom (rounded top corners)
 *
 * Props:
 *   isOpen      — show/hide
 *   onClose     — called when the green panel is tapped
 *   hero        — JSX rendered inside the green panel (parent owns all content)
 *   snapHeight  — height of the white panel (default '76%')
 *   children    — content rendered inside the white panel
 */
export default function HeroSheet({
  isOpen,
  onClose,
  hero,
  snapHeight = '78%',
  children,
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 460);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted) return null;

  // Green panel height = space above white panel + 3rem overlap behind it.
  // The overlap is hidden under white (z-10) but lets rounded-b-3xl corners
  // appear briefly during animation as the two panels slide toward each other.
  const greenHeight = `calc(100% - ${snapHeight} + 3rem)`;
  const portalTarget = document.getElementById('app-shell') ?? document.body;

  return createPortal(
    <div className="absolute inset-0 z-50 overflow-hidden">

      {/* Green hero panel — slides down from top, rounded bottom */}
      <div
        className={`absolute inset-x-0 top-0 bg-primary rounded-b-3xl overflow-hidden transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? 'translate-y-0' : '-translate-y-full'}`}
        style={{ height: greenHeight }}
        onClick={onClose}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/3 -left-24 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        {hero}
      </div>

      {/* White content panel — slides up from bottom, rounded top */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-surface-container-lowest rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: snapHeight }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-5 pb-6">
          {children}
        </div>
      </div>

    </div>,
    portalTarget,
  );
}
