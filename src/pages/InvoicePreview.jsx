import { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate, getDateLocale } from '../api/dateUtils';
import { HeaderContext } from '../App';
import { mockInvoiceViewRows } from '../mocks/invoiceView';

const STATUS_STYLES = {
  DRAFT:          { badge: 'bg-gray-100 text-gray-600',                icon: 'draft' },
  UNPAID:         { badge: 'bg-amber-100 text-amber-700',              icon: 'schedule' },
  PARTIALLY_PAID: { badge: 'bg-blue-100 text-blue-700',                icon: 'donut_large' },
  PAID:           { badge: 'bg-green-100 text-green-700',              icon: 'task_alt' },
  CANCELLED:      { badge: 'bg-error-container text-on-error-container', icon: 'cancel' },
  VOID:           { badge: 'bg-error-container text-on-error-container', icon: 'block' },
};

const PAYMENT_STATUS_STYLES = {
  PENDING:  'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-green-100 text-green-700',
  FAILED:   'bg-error-container text-on-error-container',
};

const METHOD_ICONS = {
  CASH:          'payments',
  BANK_TRANSFER: 'account_balance',
  CREDIT_CARD:   'credit_card',
  QR_PROMPTPAY:  'qr_code_2',
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
  const currency = /^[A-Z]{3}$/.test(String(row.currency)) ? row.currency : 'THB';

  return {
    invoiceNumber: toText(row.invoiceNumber) ?? '—',
    status: toText(row.status) ?? 'DRAFT',
    issuedDate: row.issuedDate,
    dueDate: row.dueDate,
    currency,
    customer: parseObject(row.customerJson) ?? {},
    sourceOrderIds: parseArray(row.sourceOrderIdsJson).map(toText).filter(Boolean),
    items: parseArray(row.itemsJson)
      .filter((i) => i && typeof i === 'object')
      .map((i) => ({
        sourceOrderId: toText(i.sourceOrderId),
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
    payments: parseArray(row.paymentsJson)
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        paymentId: toText(p.paymentId) ?? '—',
        amount: toNumber(p.amount),
        method: toText(p.method) ?? 'OTHER',
        status: toText(p.status) ?? 'PENDING',
        paidAt: p.paidAt,
        reference: toText(p.reference),
        proofUrl: safeUrl(p.proofUrl),
      })),
    subtotal: toNumber(row.subtotal),
    adjustmentTotal: toNumber(row.adjustmentTotal),
    grandTotal: toNumber(row.grandTotal),
    paidAmount: toNumber(row.paidAmount),
    balanceDue: toNumber(row.balanceDue),
  };
}

function SectionCard({ icon, title, badge, children }) {
  return (
    <section className="bg-white w-full rounded-2xl overflow-hidden">
      <div className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
          <h2 className="font-headline font-bold text-[13px] tracking-tight truncate">{title}</h2>
        </div>
        {badge && (
          <span className="flex items-center bg-surface-container rounded-full px-2.5 h-[22px] font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wider shrink-0 whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function DateChip({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide whitespace-nowrap">
        {label}
      </p>
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary whitespace-nowrap">
        {value}
      </span>
    </div>
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

  useEffect(() => {
    setOnBack?.(null);
  }, [setOnBack]);

  // Keep the URL shareable when the customer switches invoices.
  const handleSelect = (num) => {
    setSelected(num);
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
  const customerIndex = toText(invoice.customer.customerIndex) ?? toNumber(invoice.customer.customerIndex);
  const balanceDue = invoice.balanceDue ?? 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden font-body text-on-surface">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 pt-4 pb-8 space-y-5">

          {/* Invoice picker */}
          <div>
            <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide mb-1.5">
              {t('invoice.selectLabel')}
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
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

          {/* Invoice number + status + dates */}
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide mb-0.5">
                  {t('invoice.invoiceNumber')}
                </p>
                <h2 className="font-headline font-bold text-[22px] text-on-surface leading-tight truncate">
                  {invoice.invoiceNumber}
                </h2>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label text-[10px] font-bold shrink-0 mt-1 ${statusCfg.badge}`}>
                <span className="material-symbols-outlined text-[14px] leading-none">{statusCfg.icon}</span>
                {t(`invoice.status.${invoice.status}`, { defaultValue: invoice.status })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <DateChip label={t('invoice.issuedDate')} value={formatDisplayDate(invoice.issuedDate, undefined, dateLocale)} />
              <DateChip label={t('invoice.dueDate')} value={formatDisplayDate(invoice.dueDate, undefined, dateLocale)} />
            </div>
          </section>

          {/* Billed to */}
          <section className="relative border border-outline-variant/40 rounded-2xl px-4 pt-6 pb-4">
            <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide whitespace-nowrap">
              {t('invoice.billedTo')}
            </p>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 overflow-hidden">
                <span className="material-symbols-outlined fill-icon text-[44px] text-outline-variant translate-y-1">
                  account_circle
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-bold text-[15px] text-primary leading-snug">
                  {customerName ?? '–'}
                </h3>
                {customerIndex != null && (
                  <p className="font-label text-[10px] text-on-surface-variant font-bold tracking-wide mt-0.5">
                    {t('invoice.customerNo')} · {customerIndex}
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
            </div>
          </section>

          {/* Source orders */}
          <SectionCard
            icon="inventory_2"
            title={t('invoice.sourceOrders.title')}
            badge={`${invoice.sourceOrderIds.length} ${t('invoice.sourceOrders.count')}`}
          >
            {invoice.sourceOrderIds.length === 0 ? (
              <p className="px-4 py-4 font-body text-[13px] text-on-surface-variant italic">
                {t('invoice.sourceOrders.empty')}
              </p>
            ) : (
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {invoice.sourceOrderIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary"
                  >
                    <span className="material-symbols-outlined text-[14px] leading-none">local_laundry_service</span>
                    {id}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

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
                  <li key={`${item.sourceOrderId ?? 'item'}-${idx}`} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-on-surface font-medium leading-snug">
                          {item.description}
                        </p>
                        <p className="font-body text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                          {item.quantity ?? '—'}{item.unit ? ` ${item.unit}` : ''} × {formatMoney(item.unitPrice, currency)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {item.serviceType && (
                            <span className="inline-flex items-center px-2 py-px rounded-full bg-surface-container font-label text-[9px] font-bold text-on-surface-variant">
                              {item.serviceType}
                            </span>
                          )}
                          {item.sourceOrderId && (
                            <span className="font-body text-[10px] text-outline">{item.sourceOrderId}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-body text-[13px] text-on-surface-variant shrink-0">
                        {formatMoney(item.subtotal, currency)}
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

                    {item.adjustments.length > 0 && (
                      <div className="flex items-center justify-between gap-3 mt-2">
                        <span className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-wide">
                          {t('invoice.items.netTotal')}
                        </span>
                        <span className="font-headline text-[13px] font-bold text-on-surface shrink-0">
                          {formatMoney(item.netTotal, currency)}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Totals — shown exactly as stored on the invoice row */}
          <section className="bg-white rounded-2xl px-4 py-3">
            <p className="font-label text-[10px] text-primary font-bold uppercase tracking-wide mb-2">
              {t('invoice.totals.title')}
            </p>
            <TotalRow label={t('invoice.totals.subtotal')} value={formatMoney(invoice.subtotal, currency)} />
            <TotalRow
              label={t('invoice.totals.adjustments')}
              value={formatMoney(invoice.adjustmentTotal, currency)}
              tone={(invoice.adjustmentTotal ?? 0) < 0 ? 'credit' : 'default'}
            />
            <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-outline-variant/25">
              <span className="font-headline text-[14px] font-bold text-on-surface leading-snug">
                {t('invoice.totals.grandTotal')}
              </span>
              <span className="font-headline text-[18px] font-bold text-primary shrink-0">
                {formatMoney(invoice.grandTotal, currency)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/25">
              <TotalRow label={t('invoice.totals.paid')} value={formatMoney(invoice.paidAmount, currency)} />
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="font-headline text-[13px] font-bold text-on-surface leading-snug">
                  {t('invoice.totals.balanceDue')}
                </span>
                <span className={`font-headline text-[15px] font-bold shrink-0 ${balanceDue > 0 ? 'text-error' : 'text-green-700'}`}>
                  {formatMoney(invoice.balanceDue, currency)}
                </span>
              </div>
            </div>
          </section>

          {/* Payment history */}
          <SectionCard
            icon="receipt_long"
            title={t('invoice.payments.title')}
            badge={`${invoice.payments.length} ${t('invoice.payments.count')}`}
          >
            {invoice.payments.length === 0 ? (
              <p className="px-4 py-4 font-body text-[13px] text-on-surface-variant italic">
                {t('invoice.payments.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {invoice.payments.map((p, idx) => (
                  <li key={`${p.paymentId}-${idx}`} className="px-4 py-3 flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/10">
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        {METHOD_ICONS[p.method] ?? 'receipt_long'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-body text-[13px] text-on-surface font-medium leading-snug">
                          {t(`invoice.method.${p.method}`, { defaultValue: p.method })}
                        </p>
                        <span className="font-headline text-[13px] font-bold text-on-surface shrink-0">
                          {formatMoney(p.amount, currency)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center px-2 py-px rounded-full font-label text-[9px] font-bold ${PAYMENT_STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {t(`invoice.paymentStatus.${p.status}`, { defaultValue: p.status })}
                        </span>
                        <span className="font-body text-[10px] text-outline">{p.paymentId}</span>
                      </div>
                      <p className="font-body text-[11px] text-on-surface-variant leading-relaxed mt-1">
                        {formatDateTime(p.paidAt, dateLocale)}
                      </p>
                      {p.reference && (
                        <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
                          {t('invoice.payments.reference')}: {p.reference}
                        </p>
                      )}
                      {p.proofUrl && (
                        <a
                          href={p.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 font-headline text-[11px] font-bold text-primary hover:opacity-70 active:scale-95 transition-all focus:outline-none"
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">image</span>
                          {t('invoice.payments.viewProof')}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

        </div>
      </main>
    </div>
  );
}
