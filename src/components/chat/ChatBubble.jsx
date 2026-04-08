// ─── Avatars ──────────────────────────────────────────────────────────────────

export function BotAvatar() {
  return (
    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 self-end mb-4">
      <span className="material-symbols-outlined fill-icon text-on-primary text-[14px]">local_laundry_service</span>
    </div>
  );
}

export function BotAvatarPlaceholder() {
  return <div className="w-6 flex-shrink-0" />;
}

// ─── Date divider ─────────────────────────────────────────────────────────────

export function DateDivider({ label }) {
  return (
    <div className="flex justify-center my-2">
      <span className="px-3 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-body text-[11px]">
        {label}
      </span>
    </div>
  );
}

// ─── Bot bubble (plain) ───────────────────────────────────────────────────────

export function BotBubble({ children, timestamp }) {
  return (
    <div className="bg-surface-container rounded-xl rounded-bl-sm px-3 pt-2.5 pb-2 shadow-sm max-w-[260px]">
      {children}
      {timestamp && (
        <p className="font-label text-[9px] text-on-surface-variant/50 mt-1">{timestamp}</p>
      )}
    </div>
  );
}

// ─── Card bubble (LINE OA style) ──────────────────────────────────────────────
// Text + optional children on top, divider, full-width action buttons below.

export function CardBubble({ text, children, choices, confirmLabel, skipLabel, isActive, onPick, onConfirm, onSkip }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl rounded-bl-sm shadow-sm overflow-hidden max-w-[240px] border border-outline-variant/20">
      <div className="px-3 pt-2.5 pb-2.5">
        {text && <p className="font-body text-xs text-on-surface leading-relaxed">{text}</p>}
        {children}
      </div>

      {isActive && (
        <div className="border-t border-outline-variant/20">
          {choices?.map((c, i) => (
            <button
              key={c.value}
              onClick={() => onPick(c)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/5 active:bg-primary/10 transition-colors ${
                i > 0 ? 'border-t border-outline-variant/15' : ''
              }`}
            >
              {c.icon && (
                <span className="material-symbols-outlined text-primary text-[16px] flex-shrink-0">{c.icon}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-semibold text-primary leading-tight">{c.label}</p>
                {c.desc && <p className="font-body text-[10px] text-on-surface-variant leading-tight mt-0.5">{c.desc}</p>}
              </div>
              <span className="material-symbols-outlined text-outline-variant text-[14px]">chevron_right</span>
            </button>
          ))}
          {confirmLabel && (
            <button
              onClick={onConfirm}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined fill-icon text-on-primary text-[14px]">check_circle</span>
              <p className="font-body text-xs font-semibold text-on-primary">{confirmLabel}</p>
            </button>
          )}
          {skipLabel && (
            <button
              onClick={onSkip}
              className="w-full flex items-center justify-center px-3 py-2 hover:bg-surface-container active:bg-surface-container-high transition-colors"
            >
              <p className="font-body text-[11px] text-on-surface-variant">{skipLabel}</p>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── User bubble ──────────────────────────────────────────────────────────────

export function UserBubble({ message }) {
  return (
    <div className="flex justify-end mb-1">
      <div className="bg-primary rounded-xl rounded-br-sm overflow-hidden shadow-sm max-w-[240px]">
        {message.imageUrl && (
          <img src={message.imageUrl} alt="" className="w-full max-h-40 object-cover" />
        )}
        {message.text && (
          <p className="font-body text-xs text-on-primary leading-relaxed px-3 py-2">{message.text}</p>
        )}
      </div>
    </div>
  );
}
