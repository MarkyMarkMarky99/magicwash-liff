import { createPortal } from 'react-dom';

export default function SuccessModal({ title, children, action, onClose }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
      )}
      <div className="bg-surface-container-lowest rounded-[2rem] p-8 w-full max-w-[320px] flex flex-col items-center text-center shadow-2xl">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-primary text-[48px]">check_circle</span>
        </div>
        <h3 className="text-2xl font-headline font-bold text-primary mb-2">{title}</h3>
        {children && (
          <div className="w-full mb-2">{children}</div>
        )}
        {action && (
          <div className="w-full mt-4">{action}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
