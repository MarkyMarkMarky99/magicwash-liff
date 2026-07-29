import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';

/**
 * Presentational payment popup — the "scan to pay / attach a slip" dialog
 * mounted from InvoicePreview.jsx. Receipt-styled: solid header bar, QR or
 * slip in a bordered frame, bank details, a Ref 1 / Ref 2 line, an amount
 * tile, and a single state-driven footer button.
 *
 * Props in, JSX out — no fetch, no image processing, no request state
 * machine. Those stay in src/services/slipUpload.js and in
 * InvoicePreview.jsx, which owns `stage` and every handler.
 *
 * `stage` is one of 'idle' | 'preview' | 'sending' | 'result'. This
 * component refuses to let 'sending' be dismissed (header X and backdrop
 * are inert) — the caller (InvoicePreview's closePay) also refuses, since
 * there is no server-side idempotency and a double submit creates a second
 * payment row an admin has to clean up by hand.
 *
 * Props:
 *   open          boolean
 *   qrImage       QR code image src
 *   invoiceRef    Ref 1 value (invoice number)
 *   amountLabel   pre-formatted money string (e.g. "฿1,234.00")
 *   pendingNotice optional string shown under the QR view when money is
 *                 already submitted but not yet verified
 *   canSubmit     whether a slip can still be attached (false once pending
 *                 money already covers the balance) — gates the footer
 *                 button and the picker in the 'idle' stage only
 *   stage         'idle' | 'preview' | 'sending' | 'result'
 *   previewUrl    data: URI of the (already preprocessed) picked image, or null
 *   result        normalized SlipOutcome from submitSlip(), or null
 *   onPick(file)  called with the raw File the customer picked
 *   onReset()     discards the picked slip / retries after a retryable
 *                 error — always returns to 'idle' with the QR view back
 *   onSend()      confirms and submits the previewed slip
 *   onClose()     header X, backdrop, and the "dismiss" footer state
 */

const BANK_NAME = 'KASIKORN THAI';
const ACCOUNT_HOLDER = 'SARAVUT PRASERTKLANID';
const ACCOUNT_NUMBER_DISPLAY = '019-1-74755-0';
const ACCOUNT_NUMBER_RAW = '0191747550';

const TONE_STYLES = {
  success: { bg: 'bg-green-100', fg: 'text-green-700', icon: 'check_circle' },
  pending: { bg: 'bg-amber-100', fg: 'text-amber-700', icon: 'hourglass_top' },
  error: { bg: 'bg-error-container', fg: 'text-error', icon: 'error_outline' },
};

const RESULT_TITLE_KEYS = {
  success: 'invoice.slip.resultTitle.verified',
  pending: 'invoice.slip.resultTitle.pending',
  error: 'invoice.slip.resultTitle.failed',
};

function CopyAccountButton({ value, label, copiedLabel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      className="flex h-6 w-6 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className="material-symbols-outlined text-[15px] leading-none" aria-hidden="true">
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  );
}

export default function PaymentPopup({
  open,
  qrImage,
  invoiceRef,
  amountLabel,
  pendingNotice,
  canSubmit = true,
  stage,
  previewUrl,
  result,
  onPick,
  onReset,
  onSend,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const fileInputRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const sending = stage === 'sending';
  const slipChosen = stage !== 'idle';

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    closeRef.current?.focus();
    // Capture phase so Escape can't be swallowed by anything mounted underneath.
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || sending) return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, sending, onClose]);

  if (!open) return null;

  const openPicker = () => fileInputRef.current?.click();
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (file) onPick(file);
  };

  const handleBackdropClick = () => {
    if (!sending) onClose();
  };

  const toneStyle = result ? (TONE_STYLES[result.tone] ?? TONE_STYLES.error) : null;
  const resultTitleKey = result ? (RESULT_TITLE_KEYS[result.tone] ?? RESULT_TITLE_KEYS.error) : null;

  // One footer button; its label and action change with `stage`.
  let footerLabel;
  let footerIcon = null;
  let footerAction = onClose;
  if (stage === 'idle') {
    footerLabel = t('invoice.slip.attach');
    footerIcon = 'upload_file';
    footerAction = openPicker;
  } else if (stage === 'preview') {
    footerLabel = t('invoice.slip.send');
    footerIcon = 'check_circle';
    footerAction = onSend;
  } else if (stage === 'sending') {
    footerLabel = t('invoice.slip.verifying');
  } else if (result?.retryable) {
    footerLabel = t('invoice.retry');
    footerIcon = 'refresh';
    footerAction = onReset;
  } else {
    footerLabel = t('invoice.close');
    footerIcon = 'check';
    footerAction = onClose;
  }

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        aria-label={t('invoice.pay.closeAria')}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      <div className="relative z-10 flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-surface-container-lowest text-left shadow-2xl">
          {/* Header — solid bg-primary bar, X at the right. The only button that closes the popup. */}
          <div className="relative flex items-center justify-center bg-primary px-4 py-4">
            <h2 id={titleId} className="font-headline text-[16px] font-bold tracking-wide text-on-primary">
              {t('invoice.pay.title')}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              disabled={sending}
              aria-hidden={sending || undefined}
              tabIndex={sending ? -1 : 0}
              aria-label={t('invoice.close')}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-on-primary/90 transition-all hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">close</span>
            </button>
          </div>

          <div className="flex flex-col items-center px-5 py-5">
            {/* Body — exactly one of two views: QR + bank details, or the chosen slip. */}
            {!slipChosen ? (
              <>
                <div className="mb-4 rounded-xl border border-outline-variant/30 bg-white p-3 shadow-sm">
                  <img src={qrImage} alt={t('invoice.pay.title')} className="h-auto w-56 object-contain" />
                </div>
                <div className="mb-4 w-full border-b border-outline-variant/25 pb-4 text-center">
                  <p className="mb-2 font-body text-[13px] font-semibold text-primary">
                    {t('invoice.pay.scanNotice')}
                  </p>
                  <div className="space-y-1 font-body text-[12px] text-on-surface-variant">
                    <p>
                      {t('invoice.pay.bankLabel')}: <span className="font-semibold text-on-surface">{BANK_NAME}</span>
                    </p>
                    <p>
                      {t('invoice.pay.nameLabel')}: <span className="font-semibold text-on-surface">{ACCOUNT_HOLDER}</span>
                    </p>
                    <div className="flex items-center justify-center gap-1.5">
                      <p>
                        {t('invoice.pay.accountLabel')}: <span className="font-semibold text-on-surface">{ACCOUNT_NUMBER_DISPLAY}</span>
                      </p>
                      <CopyAccountButton
                        value={ACCOUNT_NUMBER_RAW}
                        label={t('invoice.pay.copyAccount')}
                        copiedLabel={t('invoice.pay.copied')}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : stage === 'result' && toneStyle ? (
              <div className="mb-4 flex w-full flex-col items-center gap-2 py-1" role="status">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${toneStyle.bg}`}>
                  <span className={`material-symbols-outlined text-[28px] ${toneStyle.fg}`} aria-hidden="true">
                    {toneStyle.icon}
                  </span>
                </div>
                <h3 className="font-headline text-[15px] font-bold text-on-surface">{t(resultTitleKey)}</h3>
                <p className="text-center font-body text-[12px] leading-relaxed text-on-surface-variant">
                  {t(result.messageKey)}
                </p>
                {result.paidAt && (
                  <p className="font-body text-[11px] text-on-surface-variant">
                    {formatDisplayDate(
                      result.paidAt,
                      { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
                      dateLocale,
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="relative mb-4">
                <img
                  src={previewUrl}
                  alt={t('invoice.slip.previewAlt')}
                  className="max-h-64 w-56 rounded-xl border border-outline-variant/30 bg-white object-contain p-2 shadow-sm"
                />
                {!sending && (
                  <button
                    type="button"
                    onClick={onReset}
                    aria-label={t('invoice.slip.clear')}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant shadow-md transition-all hover:bg-surface-container-high active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">close</span>
                  </button>
                )}
              </div>
            )}

            {/* Ref 1 / Ref 2 + amount tile — shown under either view, like a receipt total line. */}
            <div className="w-full text-center">
              <div className="mb-1 flex items-center justify-between px-3 font-body text-[11px] text-on-surface-variant">
                <span>{t('invoice.pay.ref1')}: {invoiceRef}</span>
                <span>{t('invoice.pay.ref2')}: APP</span>
              </div>
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                <p className="mb-0.5 font-label text-[10px] font-bold uppercase tracking-widest text-primary">
                  {t('invoice.pay.amountLabel')}
                </p>
                <p className="font-headline text-[28px] font-bold tracking-tight text-on-surface">{amountLabel}</p>
              </div>
            </div>

            {pendingNotice && stage === 'idle' && (
              <div className="mt-3 flex w-full items-start gap-2 border-t border-outline-variant/25 pt-3 text-left">
                <span className="material-symbols-outlined mt-0.5 text-[16px] leading-none text-amber-600" aria-hidden="true">
                  hourglass_top
                </span>
                <p className="font-body text-[11px] leading-relaxed text-amber-700">{pendingNotice}</p>
              </div>
            )}
          </div>

          {/* Footer — exactly one button, state-driven. No separate Close button here;
              closing the popup is the header X (or, on a settled result, this same button).
              In the 'idle' stage with nothing left to submit (pending money already
              covers the balance), there is no action to offer — no footer at all. */}
          {(stage !== 'idle' || canSubmit) && (
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={footerAction}
                disabled={sending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-[14px] font-bold text-on-primary shadow-md transition-all active:scale-[0.98] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {sending ? (
                  <span className="material-symbols-outlined animate-spin text-[18px] leading-none" aria-hidden="true">
                    progress_activity
                  </span>
                ) : footerIcon ? (
                  <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">{footerIcon}</span>
                ) : null}
                {footerLabel}
              </button>
            </div>
          )}

          <div className="h-1.5 bg-primary" />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>
    </div>
  );
}
