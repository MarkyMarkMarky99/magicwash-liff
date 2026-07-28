import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../../api/dateUtils';

/**
 * Dumb view for the "attach a payment slip" flow — mounted inside the QR
 * payment popup in InvoicePreview.jsx, below the QR code and its
 * explanatory text.
 *
 * Presentation only: given `stage` and data, it renders. It owns no fetch,
 * no image processing, and no request state machine — those live in
 * src/services/slipUpload.js (pure helpers) and in InvoicePreview.jsx (the
 * orchestration: which stage we're in, what was picked, what came back).
 *
 * `stage` is one of 'idle' | 'preview' | 'sending' | 'result'. This
 * component never offers a way to dismiss or resubmit while 'sending' — the
 * caller must also refuse to close the surrounding popup during that stage,
 * since there is no server-side idempotency and a double submit creates a
 * second payment row an admin has to clean up by hand.
 *
 * Props:
 *   stage       'idle' | 'preview' | 'sending' | 'result'
 *   previewUrl  data: URI of the (already preprocessed) picked image, or null
 *   result      normalized SlipOutcome from submitSlip(), or null
 *   onPick(file) called with the raw File the customer picked
 *   onSend()     called when they confirm sending the previewed slip
 *   onReset()    called for cancel / replace-confirm / retry / done — always
 *                returns to 'idle' (or, for "replace", reopens the picker)
 */

function formatBaht(value) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : null;
  if (n == null) return null;
  const amount = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `฿${amount}`;
}

const TONE_STYLES = {
  success: { bg: 'bg-green-100', fg: 'text-green-700', icon: 'check_circle' },
  pending: { bg: 'bg-amber-100', fg: 'text-amber-700', icon: 'hourglass_top' },
  error:   { bg: 'bg-error-container', fg: 'text-error', icon: 'error_outline' },
};

const RESULT_TITLE_KEYS = {
  success: 'invoice.slip.resultTitle.verified',
  pending: 'invoice.slip.resultTitle.pending',
  error:   'invoice.slip.resultTitle.failed',
};

export default function SlipUpload({ stage, previewUrl, result, onPick, onSend, onReset }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const fileInputRef = useRef(null);

  const openPicker = () => fileInputRef.current?.click();
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (file) onPick(file);
  };

  const toneStyle = result ? (TONE_STYLES[result.tone] ?? TONE_STYLES.error) : null;
  const resultTitleKey = result ? (RESULT_TITLE_KEYS[result.tone] ?? RESULT_TITLE_KEYS.error) : null;

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {stage === 'idle' && (
        <button
          type="button"
          onClick={openPicker}
          className="w-full h-12 rounded-2xl border border-primary/40 text-primary font-label text-[12px] font-semibold flex items-center justify-center gap-2 transition-all hover:bg-primary/5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">upload_file</span>
          {t('invoice.slip.attach')}
        </button>
      )}

      {stage === 'preview' && previewUrl && (
        <div className="w-full flex flex-col items-center gap-3">
          <img
            src={previewUrl}
            alt={t('invoice.slip.previewAlt')}
            className="max-h-[40vh] w-auto max-w-full object-contain rounded-xl shadow"
          />
          <div className="w-full flex flex-col gap-2">
            <button
              type="button"
              onClick={onSend}
              className="w-full h-11 rounded-xl bg-primary text-on-primary font-label text-[12px] font-semibold transition-all hover:bg-primary/90 active:scale-[0.98] focus:outline-none"
            >
              {t('invoice.slip.send')}
            </button>
            <button
              type="button"
              onClick={openPicker}
              className="w-full h-10 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label text-[12px] font-semibold transition-all hover:bg-surface-container active:scale-[0.98] focus:outline-none"
            >
              {t('invoice.slip.replace')}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full h-9 font-label text-[11px] font-semibold text-on-surface-variant transition-all hover:opacity-80 active:scale-[0.98] focus:outline-none"
            >
              {t('invoice.slip.cancel')}
            </button>
          </div>
        </div>
      )}

      {stage === 'sending' && (
        <div className="py-4 flex flex-col items-center gap-3" role="status">
          <span className="material-symbols-outlined text-primary text-5xl animate-pulse" aria-hidden="true">cloud_upload</span>
          <p className="font-body text-[12px] text-on-surface-variant leading-relaxed text-center">
            {t('invoice.slip.sending')}
          </p>
        </div>
      )}

      {stage === 'result' && result && toneStyle && (
        <div className="py-2 flex flex-col items-center gap-3 w-full" role="status">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${toneStyle.bg}`}>
            <span className={`material-symbols-outlined text-[32px] ${toneStyle.fg}`} aria-hidden="true">{toneStyle.icon}</span>
          </div>
          <h3 className="font-headline font-bold text-[16px] text-on-surface">{t(resultTitleKey)}</h3>
          <p className="font-body text-[12px] text-on-surface-variant leading-relaxed">{t(result.messageKey)}</p>
          {result.amount != null && (
            <p className="font-headline font-bold text-[20px] text-on-surface">{formatBaht(result.amount)}</p>
          )}
          {result.paidAt && (
            <p className="font-body text-[11px] text-on-surface-variant">
              {formatDisplayDate(
                result.paidAt,
                { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
                dateLocale,
              )}
            </p>
          )}
          <div className="w-full mt-2 flex flex-col gap-2">
            {result.retryable && (
              <button
                type="button"
                onClick={onReset}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-label text-[12px] font-semibold transition-all hover:bg-primary/90 active:scale-[0.98] focus:outline-none"
              >
                {t('invoice.retry')}
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="w-full h-10 rounded-xl border border-outline-variant/50 text-on-surface-variant font-label text-[12px] font-semibold transition-all hover:bg-surface-container active:scale-[0.98] focus:outline-none"
            >
              {t('invoice.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
