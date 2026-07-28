import { useState, useEffect, useContext, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../api/dateUtils';
import { getInvoiceByNumber } from '../api/gvizApi';
import { HeaderContext } from '../App';
import DateChip from '../components/ui/DateChip';
import CustomerDetailsCard from '../components/ui/CustomerDetailsCard';
import PageActionFooter from '../components/ui/PageActionFooter';
import SectionCard, { BADGE_PILL } from '../components/ui/SectionCard';
import SlipUpload from '../components/invoice/SlipUpload';
import { preprocessSlipImage, submitSlip } from '../services/slipUpload';
import qrPaymentImage from '../assets/IMG_8640.webp';

const STATUS_STYLES = {
  DRAFT:          { badge: 'bg-gray-100 text-gray-600',                icon: 'draft' },
  UNPAID:         { badge: 'bg-amber-100 text-amber-700',              icon: 'schedule' },
  OVERDUE:        { badge: 'bg-error-container text-on-error-container', icon: 'event_busy' },
  PARTIALLY_PAID: { badge: 'bg-blue-100 text-blue-700',                icon: 'donut_large' },
  PAID:           { badge: 'bg-green-100 text-green-700',              icon: 'task_alt' },
  CANCELLED:      { badge: 'bg-error-container text-on-error-container', icon: 'cancel' },
  VOID:           { badge: 'bg-error-container text-on-error-container', icon: 'block' },
};

const PAYMENT_STATUS_STYLES = {
  PENDING:  'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-green-100 text-green-700',
  FAILED:   'bg-error-container text-on-error-container',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const METHOD_ICONS = {
  CASH:          'payments',
  BANK_TRANSFER: 'account_balance',
  CREDIT_CARD:   'credit_card',
  QR_PROMPTPAY:  'qr_code_2',
  GIFT_VOUCHER:  'redeem',
  OTHER:         'receipt_long',
};

/* ── Defensive parsing ──
   Rows arrive raw from the sheet: nested documents are JSON strings that may be
   empty, malformed, or already decoded by an upstream layer. Never throw. */

function parseJson(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw; // already decoded upstream
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseObject(raw) {
  const v = parseJson(raw);
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}

function parseArray(raw) {
  const v = parseJson(raw);
  return Array.isArray(v) ? v : [];
}

function toNumber(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toText(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Only http(s) links are rendered — keeps `javascript:` payloads out of href. */
function safeUrl(raw) {
  const s = toText(raw);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

function formatMoney(value, currency) {
  const n = toNumber(value);
  if (n == null) return '—';
  const amount = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = n < 0 ? '-' : '';
  return currency === 'THB' ? `${sign}฿${amount}` : `${sign}${amount} ${currency}`;
}

function formatDateTime(raw, locale) {
  const s = toText(raw);
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString(locale, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Normalises one raw sheet row into the shape the UI renders. */
function readInvoice(row) {
  if (!row) return null;

  return {
    invoiceNumber: toText(row.invoiceNumber) ?? '—',
    status: toText(row.status) ?? 'DRAFT',
    billingType: toText(row.billingType) ?? 'ORDER',
    billingPeriodStart: row.billingPeriodStart,
    billingPeriodEnd: row.billingPeriodEnd,
    issuedDate: row.issuedDate,
    dueDate: row.dueDate,
    currency: 'THB',
    customer: parseObject(row.customerJson) ?? {},
    items: parseArray(row.itemsJson)
      .filter((i) => i && typeof i === 'object')
      .map((i) => ({
        serviceType: toText(i.serviceType),
        description: toText(i.description) ?? '—',
        quantity: toNumber(i.quantity),
        unit: toText(i.unit),
        unitPrice: toNumber(i.unitPrice),
        subtotal: toNumber(i.subtotal),
        netTotal: toNumber(i.netTotal),
        adjustments: (Array.isArray(i.adjustments) ? i.adjustments : [])
          .filter((a) => a && typeof a === 'object')
          .map((a) => ({ label: toText(a.label) ?? '—', amount: toNumber(a.amount) })),
      })),
    adjustments: parseArray(row.adjustmentsJson)
      .filter((a) => a && typeof a === 'object')
      .map((a) => ({ label: toText(a.label) ?? '—', amount: toNumber(a.amount) })),
    payments: parseArray(row.paymentsJson)
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        amount: toNumber(p.amount),
        method: toText(p.method) ?? 'OTHER',
        status: toText(p.status) ?? 'PENDING',
        paidAt: p.paidAt,
        proofUrl: safeUrl(p.proofUrl),
      })),
    subtotal: toNumber(row.subtotal),
    adjustmentTotal: toNumber(row.adjustmentTotal),
    grandTotal: toNumber(row.grandTotal),
    paidAmount: toNumber(row.paidAmount),
    balanceDue: toNumber(row.balanceDue),
  };
}

/**
 * The payment count badge, upgraded to a dropdown trigger.
 *
 * The panel is `fixed` and positioned below the trigger so it escapes both the
 * card and the scrolling `<main>`. Dismisses on outside pointerdown, Escape, and scroll.
 * `suspended` parks the dismiss listeners while the lightbox is on top, so the
 * row that opened it stays mounted and can receive focus back.
 */
function PaymentsMenu({ payments, currency, dateLocale, suspended, onSelectProof }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  const close = useCallback((refocus) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const handleToggle = () => {
    if (open) { close(false); return; }
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    setPos({
      right: Math.max(8, window.innerWidth - r.right),
      top: r.bottom + 6,
      maxHeight: Math.max(96, spaceBelow - 16),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open || suspended) return;
    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      close(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') close(true); };
    const dismiss = () => close(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open, suspended, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? panelId : undefined}
        className={`${BADGE_PILL} relative gap-1 pr-1.5 hover:bg-surface-container-high active:scale-95 transition-all focus:outline-none after:absolute after:content-[''] after:-inset-2`}
      >
        {payments.length} {t('invoice.payments.count')}
        <span
          className={`material-symbols-outlined text-[14px] leading-none transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

        {open && pos && createPortal(
          <ul
            ref={panelRef}
            id={panelId}
            style={pos}
            className="fixed z-[60] w-64 py-1 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-y-auto no-scrollbar"
          >
            {payments.map((p, idx) => {
              const methodLabel = t(`invoice.method.${p.method}`, { defaultValue: p.method });
              const body = (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="material-symbols-outlined text-primary text-[16px] leading-none shrink-0"
                      role="img"
                      aria-label={methodLabel}
                      title={methodLabel}
                    >
                      {METHOD_ICONS[p.method] ?? 'receipt_long'}
                    </span>
                    <span className="font-body text-[11px] text-on-surface-variant truncate">
                      {formatDateTime(p.paidAt, dateLocale)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-px rounded-full font-label text-[9px] font-bold shrink-0 ${PAYMENT_STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t(`invoice.paymentStatus.${p.status}`, { defaultValue: p.status })}
                    </span>
                  </span>
                  <span className="font-headline text-[12px] font-bold text-on-surface shrink-0">
                    {formatMoney(p.amount, currency)}
                  </span>
                </div>
              );
              return (
                <li key={`${p.paidAt ?? p.method}-${idx}`}>
                  {p.proofUrl ? (
                    <button
                      type="button"
                      onClick={() => onSelectProof(p.proofUrl)}
                      className="w-full text-left px-3 py-2 transition-colors hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none active:bg-surface-container"
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="px-3 py-2">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}

/**
 * Full-screen overlay shell — backdrop, close button, Escape, focus handling.
 * Shared by the payment-slip viewer and the QR payment popup so both dismiss
 * identically. Clicks on the content are swallowed; clicks around it close.
 */
function Lightbox({ label, onClose, children }) {
  const { t } = useTranslation();
  const closeRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    // Capture phase so Escape never reaches the dropdown's own handler underneath.
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t('invoice.close')}
        className="absolute top-4 right-4 text-white/80 hover:text-white active:scale-95 transition-all focus:outline-none"
      >
        <span className="material-symbols-outlined text-[28px]" aria-hidden="true">close</span>
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full flex items-center justify-center"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function TotalRow({ label, value, tone = 'default' }) {
  const valueClass =
    tone === 'credit' ? 'text-green-700' :
      tone === 'due' ? 'text-error' :
        'text-on-surface';
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="font-body text-[13px] text-on-surface-variant leading-snug">{label}</span>
      <span className={`font-body text-[13px] shrink-0 ${valueClass}`}>{value}</span>
    </div>
  );
}

const NOOP = () => {};

export default function InvoicePreview({ invoiceNumber, onBack = NOOP, mockRow = null }) {
  const { t, i18n } = useTranslation();
  const setOnBack = useContext(HeaderContext);
  const requestedInvoiceNumber = toText(invoiceNumber);
  const [row, setRow] = useState(mockRow);
  const [status, setStatus] = useState(mockRow ? 'done' : requestedInvoiceNumber ? 'loading' : 'notFound');
  const [retryCount, setRetryCount] = useState(0);
  const [proofUrl, setProofUrl] = useState(null); // open slip lightbox, or null
  const [payOpen, setPayOpen] = useState(false);  // QR payment popup

  // "Attach a payment slip" orchestration — lives here, not in the view
  // component. stage drives what SlipUpload renders inside the QR popup.
  const [slipStage, setSlipStage] = useState('idle'); // idle | preview | sending | result
  const [slipPreviewUrl, setSlipPreviewUrl] = useState(null);
  const [slipPayload, setSlipPayload] = useState(null); // { base64, filename, contentType }, ready to submit
  const [slipResult, setSlipResult] = useState(null);   // normalized SlipOutcome from submitSlip()

  useEffect(() => {
    if (!setOnBack) return undefined;
    setOnBack(() => onBack);
    return () => setOnBack(null);
  }, [onBack, setOnBack]);

  useEffect(() => {
    let active = true;

    if (mockRow) {
      return () => { active = false; };
    }

    if (!requestedInvoiceNumber) {
      return () => { active = false; };
    }

    getInvoiceByNumber(
      requestedInvoiceNumber,
      (fresh) => {
        if (active) setRow(fresh);
      },
    )
      .then((fresh) => {
        if (!active) return;
        setRow(fresh);
        setStatus(fresh ? 'done' : 'notFound');
      })
      .catch(() => {
        if (!active) return;
        setRow(null);
        setStatus('error');
      });

    return () => { active = false; };
  }, [mockRow, requestedInvoiceNumber, retryCount]);

  const closeProof = useCallback(() => setProofUrl(null), []);

  const resetSlip = useCallback(() => {
    setSlipStage('idle');
    setSlipPreviewUrl(null);
    setSlipPayload(null);
    setSlipResult(null);
  }, []);

  // Gates every dismiss path the QR popup has (backdrop click, Escape, the
  // X button — Lightbox routes all three through this one onClose prop).
  // There's no server-side idempotency for a slip submission: closing the
  // popup mid-flight wouldn't cancel the request, it would just orphan the
  // UI and invite the customer to reopen and resubmit, creating a second
  // payment row an admin has to clean up by hand.
  const closePay = useCallback(() => {
    if (slipStage === 'sending') return;
    setPayOpen(false);
    resetSlip();
  }, [slipStage, resetSlip]);

  const handleSlipPick = useCallback(async (file) => {
    const processed = await preprocessSlipImage(file);
    setSlipPayload(processed);
    setSlipPreviewUrl(`data:${processed.contentType};base64,${processed.base64}`);
    setSlipResult(null);
    setSlipStage('preview');
  }, []);

  const handleRetry = useCallback(() => {
    setProofUrl(null);
    setPayOpen(false);
    resetSlip();
    if (mockRow) {
      setRow(mockRow);
      setStatus('done');
      return;
    }
    setRow(null);
    setStatus('loading');
    setRetryCount((count) => count + 1);
  }, [mockRow, resetSlip]);

  const dateLocale = getDateLocale(i18n.language);
  const invoice = readInvoice(row);

  if (status === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" role="status">
        <span className="material-symbols-outlined text-primary text-5xl animate-pulse" aria-hidden="true">local_laundry_service</span>
        <p className="font-body text-on-surface-variant text-sm">{t('loading')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
        <span className="material-symbols-outlined text-error text-5xl" aria-hidden="true">error_outline</span>
        <p className="font-body text-on-surface-variant text-sm">{t('invoice.loadError')}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-xl bg-primary px-4 py-2 font-label text-[12px] font-semibold text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t('invoice.retry')}
        </button>
      </div>
    );
  }

  if (status === 'notFound' || !invoice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" role="status">
        <span className="material-symbols-outlined text-error text-5xl" aria-hidden="true">receipt_long</span>
        <p className="font-body text-on-surface-variant text-sm">{t('invoice.notFound')}</p>
      </div>
    );
  }

  const { currency } = invoice;
  const statusCfg = STATUS_STYLES[invoice.status] ?? { badge: 'bg-gray-100 text-gray-600', icon: 'receipt_long' };
  const customerCode = toText(invoice.customer.customerCode);
  const balanceDue = invoice.balanceDue ?? 0;
  const paidAmountForDisplay = invoice.paidAmount > 0 ? -invoice.paidAmount : invoice.paidAmount;
  const hasPayments = invoice.payments.length > 0;

  // `balanceDue` only nets off *verified* money, so a payment the customer has
  // already submitted but the shop has not confirmed is invisible to it. Netting
  // pending money off here keeps us from asking twice for the same amount.
  const pendingAmount = invoice.payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const remainingDue = Math.max(0, balanceDue - pendingAmount);
  // DRAFT isn't finalized yet and CANCELLED/VOID has nothing left to collect —
  // neither is payable, regardless of what balanceDue happens to say.
  const collectable = !['DRAFT', 'CANCELLED', 'VOID'].includes(invoice.status);
  // Ask only for what is not already in flight; when pending covers the balance,
  // the footer opens the same QR (still reachable) with a pending notice instead
  // of a fresh "Pay now" ask for money that's already on its way.
  const canPay = collectable && remainingDue > 0;
  const awaitingVerification = collectable && !canPay && balanceDue > 0 && pendingAmount > 0;

  // Not memoized: `invoice`/`remainingDue` only exist past the early returns
  // above, so this can't be a useCallback (that would call a hook
  // conditionally). It only ever runs from a click inside the QR popup.
  const handleSlipSend = async () => {
    if (!slipPayload) return;
    setSlipStage('sending');
    const outcome = await submitSlip({
      invoiceNumber: invoice.invoiceNumber,
      balanceDue: remainingDue,
      ...slipPayload,
    });
    setSlipResult(outcome);
    setSlipStage('result');
  };

  // Footer content is derived once so every visible state shares one fixed-height
  // bar. Draft intentionally has no footer. Other invoice statuses are surfaced
  // as the `caption` above an action or as the `label` itself.
  const statusLabel = t(`invoice.status.${invoice.status}`, { defaultValue: invoice.status });
  let footer;
  if (invoice.status === 'DRAFT') {
    footer = null;
  } else if (!collectable) {
    // Cancelled / void: nothing to do, so the status word is the whole message.
    footer = { icon: statusCfg.icon, label: statusLabel, amount: formatMoney(balanceDue, currency) };
  } else if (canPay) {
    footer = { icon: 'qr_code_2', caption: statusLabel, label: t('invoice.pay.action'), amount: formatMoney(remainingDue, currency), onClick: () => setPayOpen(true) };
  } else if (awaitingVerification) {
    footer = { icon: 'hourglass_top', caption: statusLabel, label: t('invoice.pay.pendingLabel'), amount: formatMoney(pendingAmount, currency), onClick: () => setPayOpen(true) };
  } else {
    // Fully settled: also just the status word — the paid total speaks for itself.
    footer = { icon: statusCfg.icon, label: statusLabel, amount: formatMoney(invoice.paidAmount, currency) };
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden font-body text-on-surface">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 pt-4 pb-8 space-y-5">

          {/* Invoice number on the left, dates on the right.
              Status now lives only in the payment footer — see below. */}
          <section className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide mb-0.5">
                {t('invoice.invoiceNumber')}
              </p>
              <h2 className="font-headline font-bold text-[22px] text-on-surface leading-tight truncate">
                {invoice.invoiceNumber}
              </h2>
            </div>
            <div className="shrink-0 min-w-[112px] flex flex-col items-end gap-2 pt-0.5">
              <DateChip label={t('invoice.issuedDate')} value={formatDisplayDate(invoice.issuedDate, undefined, dateLocale)} />
              <DateChip label={t('invoice.dueDate')} value={formatDisplayDate(invoice.dueDate, undefined, dateLocale)} />
            </div>
          </section>

          <CustomerDetailsCard
            label={t('invoice.billedTo')}
            customer={invoice.customer}
            customerCode={customerCode}
            customerCodeLabel={t('invoice.customerNo')}
          />

          {/* Charges */}
          <SectionCard
            icon="checkroom"
            title={t('invoice.items.title')}
            badge={`${invoice.items.length} ${t('invoice.items.count')}`}
          >
            {invoice.items.length === 0 ? (
              <p className="px-4 py-4 font-body text-[13px] text-on-surface-variant italic">
                {t('invoice.items.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {invoice.items.map((item, idx) => (
                  <li key={`${item.description}-${idx}`} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-body text-sm text-on-surface font-medium leading-snug truncate">
                            {item.description}
                          </p>
                          {item.serviceType && (
                            <span className="inline-flex items-center px-2 py-px rounded-full bg-surface-container font-label text-[9px] font-bold text-on-surface-variant shrink-0">
                              {item.serviceType}
                            </span>
                          )}
                        </div>
                        <p className="font-body text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                          {item.quantity ?? '—'}{item.unit ? ` ${item.unit}` : ''} × {formatMoney(item.unitPrice, currency)}
                        </p>
                      </div>
                      <span className="font-headline text-[13px] font-bold text-on-surface shrink-0">
                        {formatMoney(item.netTotal ?? item.subtotal, currency)}
                      </span>
                    </div>

                    {item.adjustments.length > 0 && (
                      <div className="mt-2 pl-3 border-l-2 border-outline-variant/30 space-y-1">
                        {item.adjustments.map((adj, aIdx) => (
                          <div key={`${adj.label}-${aIdx}`} className="flex items-start justify-between gap-3">
                            <span className="font-body text-[11px] text-on-surface-variant leading-relaxed">
                              {adj.label}
                            </span>
                            <span className={`font-body text-[11px] shrink-0 ${(adj.amount ?? 0) < 0 ? 'text-green-700' : 'text-on-surface-variant'}`}>
                              {formatMoney(adj.amount, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Totals — shown exactly as stored on the invoice row.
              The payment count is the only interactive part of the header; it drops
              down the payment list. Remounting on the invoice number keeps it closed per invoice. */}
          <SectionCard
            icon="calculate"
            title={t('invoice.totals.title')}
            action={hasPayments ? (
              <PaymentsMenu
                key={invoice.invoiceNumber}
                payments={invoice.payments}
                currency={currency}
                dateLocale={dateLocale}
                suspended={proofUrl != null || payOpen}
                onSelectProof={setProofUrl}
              />
            ) : null}
          >
            <div className="px-4 py-3">
              <TotalRow label={t('invoice.totals.subtotal')} value={formatMoney(invoice.subtotal, currency)} />
              <TotalRow
                label={t('invoice.totals.adjustments')}
                value={formatMoney(invoice.adjustmentTotal, currency)}
                tone={(invoice.adjustmentTotal ?? 0) < 0 ? 'credit' : 'default'}
              />
              <TotalRow
                label={t('invoice.totals.paid')}
                value={formatMoney(paidAmountForDisplay, currency)}
                tone={paidAmountForDisplay < 0 ? 'credit' : 'default'}
              />
              <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-outline-variant/25">
                <span className="font-headline text-[14px] font-bold text-on-surface leading-snug">
                  {t('invoice.totals.totalDue')}
                </span>
                <span className={`font-headline text-[18px] font-bold shrink-0 ${balanceDue > 0 ? 'text-error' : 'text-green-700'}`}>
                  {formatMoney(invoice.balanceDue, currency)}
                </span>
              </div>
            </div>
          </SectionCard>

        </div>
      </main>

      {/* Fixed-height payment footer. Draft invoices intentionally omit it. */}
      {footer && <PageActionFooter {...footer} />}

      {proofUrl && (
        <Lightbox label={t('invoice.payments.viewProof')} onClose={closeProof}>
          <img
            src={proofUrl}
            alt={t('invoice.payments.viewProof')}
            referrerPolicy="no-referrer"
            className="max-h-[80vh] max-w-full w-auto object-contain rounded-xl shadow-2xl"
          />
        </Lightbox>
      )}

      {payOpen && (
        <Lightbox label={t('invoice.pay.title')} onClose={closePay}>
          {/* Content order is deliberate: QR first, then what/why it's for, then
              any guidance — so the QR is never buried under text on a small screen. */}
          <div className="w-[280px] max-w-full max-h-[80vh] overflow-y-auto no-scrollbar bg-surface-container-lowest rounded-2xl shadow-2xl p-5 flex flex-col items-center text-center">
            <img
              src={qrPaymentImage}
              alt={t('invoice.pay.title')}
              className="w-full rounded-xl"
            />
            <p className="font-headline font-bold text-[22px] text-on-surface leading-tight mt-4">
              {formatMoney(awaitingVerification ? pendingAmount : remainingDue, currency)}
            </p>
            <p className="font-body text-[12px] text-on-surface-variant mt-0.5">
              {t('invoice.pay.title')}
            </p>
            {awaitingVerification && (
              <div className="w-full mt-3 pt-3 border-t border-outline-variant/25 flex items-start gap-2 text-left">
                <span className="material-symbols-outlined text-amber-600 text-[16px] leading-none mt-0.5" aria-hidden="true">hourglass_top</span>
                <p className="font-body text-[11px] text-amber-700 leading-relaxed">
                  {t('invoice.pay.pendingNotice')}
                </p>
              </div>
            )}

            {/* Attach-a-slip flow: same screen the customer is already on
                after scanning and transferring. canPay-gated — nothing left
                to submit once pending money already covers the balance. */}
            {canPay && (
              <div className="w-full mt-4 pt-4 border-t border-outline-variant/25">
                <SlipUpload
                  stage={slipStage}
                  previewUrl={slipPreviewUrl}
                  result={slipResult}
                  onPick={handleSlipPick}
                  onSend={handleSlipSend}
                  onReset={resetSlip}
                />
              </div>
            )}
          </div>
        </Lightbox>
      )}
    </div>
  );
}
