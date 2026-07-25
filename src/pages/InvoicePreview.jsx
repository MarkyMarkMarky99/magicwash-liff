import { useState, useEffect, useContext, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../api/dateUtils';
import { HeaderContext } from '../App';
import DateChip from '../components/ui/DateChip';
import { mockInvoiceViewRows } from '../mocks/invoiceView';

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

/**
 * Validates the invoice number coming from the URL against the known rows.
 * Falls back to the first invoice so the page always has something to render.
 */
function resolveInvoiceNumber(raw, rows) {
  const wanted = toText(raw);
  const match = wanted && rows.find((r) => r?.invoiceNumber === wanted);
  return match ? match.invoiceNumber : rows[0]?.invoiceNumber ?? null;
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

/** Pill used for the header count badge — shared so the menu trigger matches it exactly. */
const BADGE_PILL = 'flex items-center bg-surface-container rounded-full px-2.5 h-[22px] font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wider shrink-0 whitespace-nowrap';

/**
 * Card with a static titled header. `action` replaces the plain badge when the
 * count itself needs to be interactive; the header stays non-interactive.
 * No `overflow-hidden` — an anchored menu must be able to escape the card.
 */
function SectionCard({ icon, title, badge, action, children }) {
  return (
    <section className="bg-white w-full rounded-2xl">
      <div className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between gap-2 rounded-t-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-primary text-[16px]" aria-hidden="true">{icon}</span>
          <h2 className="font-headline font-bold text-[13px] tracking-tight truncate">{title}</h2>
        </div>
        {action ?? (badge && <span className={BADGE_PILL}>{badge}</span>)}
      </div>
      {children}
    </section>
  );
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

/** Full-screen proof image. Dismisses on backdrop, close button, and Escape. */
function ProofLightbox({ url, label, onClose }) {
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
        aria-label="Close"
        className="absolute top-4 right-4 text-white/80 hover:text-white active:scale-95 transition-all focus:outline-none"
      >
        <span className="material-symbols-outlined text-[28px]" aria-hidden="true">close</span>
      </button>
      <img
        src={url}
        alt={label}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-full w-auto object-contain rounded-xl shadow-2xl"
      />
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

export default function InvoicePreview({ invoiceNumber }) {
  const rows = mockInvoiceViewRows.filter((r) => toText(r?.invoiceNumber));
  const { t, i18n } = useTranslation();
  const setOnBack = useContext(HeaderContext);
  const [selected, setSelected] = useState(() => resolveInvoiceNumber(invoiceNumber, rows));
  const [proofUrl, setProofUrl] = useState(null); // open lightbox, or null

  useEffect(() => {
    setOnBack?.(null);
  }, [setOnBack]);

  const closeProof = useCallback(() => setProofUrl(null), []);

  // Keep the URL shareable when the customer switches invoices.
  const handleSelect = (num) => {
    setSelected(num);
    setProofUrl(null);
    const params = new URLSearchParams(window.location.search);
    params.set('invoiceNumber', num);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  };

  const dateLocale = getDateLocale(i18n.language);
  const invoice = readInvoice(rows.find((r) => r?.invoiceNumber === selected));

  if (!invoice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-error text-5xl">receipt_long</span>
        <p className="font-body text-on-surface-variant text-sm">{t('invoice.notFound')}</p>
      </div>
    );
  }

  const { currency } = invoice;
  const statusCfg = STATUS_STYLES[invoice.status] ?? { badge: 'bg-gray-100 text-gray-600', icon: 'receipt_long' };
  const customerName = toText(invoice.customer.customerName);
  const customerCode = toText(invoice.customer.customerCode);
  const balanceDue = invoice.balanceDue ?? 0;
  const paidAmountForDisplay = invoice.paidAmount > 0 ? -invoice.paidAmount : invoice.paidAmount;
  const hasPayments = invoice.payments.length > 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden font-body text-on-surface">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 pt-4 pb-8 space-y-5">

          {/* Invoice picker */}
          <div>
            <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide mb-1.5">
              {t('invoice.selectLabel')}
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {rows.map((row) => {
                const num = row.invoiceNumber;
                const active = num === selected;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelect(num)}
                    aria-pressed={active}
                    className={`shrink-0 px-3 h-8 rounded-full font-headline text-[11px] font-bold transition-all active:scale-95 focus:outline-none ${active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                  >
                    {num.replace(/^INV-/, '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Invoice number + status on the left, dates on the right */}
          <section className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide mb-0.5">
                {t('invoice.invoiceNumber')}
              </p>
              <h2 className="font-headline font-bold text-[22px] text-on-surface leading-tight truncate">
                {invoice.invoiceNumber}
              </h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label text-[10px] font-bold mt-2 ${statusCfg.badge}`}>
                <span className="material-symbols-outlined text-[14px] leading-none">{statusCfg.icon}</span>
                {t(`invoice.status.${invoice.status}`, { defaultValue: invoice.status })}
              </span>
            </div>
            <div className="shrink-0 min-w-[112px] flex flex-col items-end gap-2 pt-0.5">
              <DateChip label={t('invoice.issuedDate')} value={formatDisplayDate(invoice.issuedDate, undefined, dateLocale)} />
              <DateChip label={t('invoice.dueDate')} value={formatDisplayDate(invoice.dueDate, undefined, dateLocale)} />
            </div>
          </section>

          {/* Billed to */}
          <section className="relative border border-outline-variant/40 rounded-2xl px-4 pt-6 pb-4">
            <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide whitespace-nowrap">
              {t('invoice.billedTo')}
            </p>
            <div className="min-w-0">
              <h3 className="font-headline font-bold text-[15px] text-primary leading-snug">
                {customerName ?? '–'}
              </h3>
              {customerCode && (
                <p className="font-label text-[10px] text-on-surface-variant font-bold tracking-wide mt-0.5">
                  {t('invoice.customerNo')} · {customerCode}
                </p>
              )}
              {toText(invoice.customer.phone) && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-on-surface-variant text-[14px] leading-none">call</span>
                  <p className="font-body text-[11px] text-on-surface-variant">{invoice.customer.phone}</p>
                </div>
              )}
              {toText(invoice.customer.email) && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-on-surface-variant text-[14px] leading-none">mail</span>
                  <p className="font-body text-[11px] text-on-surface-variant truncate">{invoice.customer.email}</p>
                </div>
              )}
              {toText(invoice.customer.address) && (
                <div className="flex items-start gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-on-surface-variant text-[14px] leading-none mt-px">location_on</span>
                  <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
                    {invoice.customer.address}
                  </p>
                </div>
              )}
            </div>
          </section>

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
              down the payment list. Remounting on `selected` keeps it closed per invoice. */}
          <SectionCard
            icon="calculate"
            title={t('invoice.totals.title')}
            action={hasPayments ? (
              <PaymentsMenu
                key={selected}
                payments={invoice.payments}
                currency={currency}
                dateLocale={dateLocale}
                suspended={proofUrl != null}
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

      {proofUrl && (
        <ProofLightbox url={proofUrl} label={t('invoice.payments.viewProof')} onClose={closeProof} />
      )}
    </div>
  );
}
