export default function PageActionFooter({ icon, caption, label, amount, onClick }) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <footer className="flex-none px-4 pt-3 pb-4 bg-surface border-t border-outline-variant/20 z-40">
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`w-full h-14 rounded-2xl px-4 flex items-center justify-between gap-3 text-left bg-primary text-on-primary shadow-md transition-all focus:outline-none ${
          onClick ? 'hover:opacity-95 active:scale-[0.98]' : ''
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-[20px] leading-none shrink-0" aria-hidden="true">{icon}</span>
          <span className="min-w-0 flex flex-col items-start justify-center leading-tight">
            {caption && (
              <span className="font-label text-[9px] font-bold uppercase tracking-wide truncate text-on-primary/70">
                {caption}
              </span>
            )}
            <span className="font-headline font-bold text-[14px] truncate">{label}</span>
          </span>
        </span>
        {amount != null && (
          <span className="font-headline font-bold text-[15px] shrink-0">{amount}</span>
        )}
      </Tag>
    </footer>
  );
}
