import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../ui/SectionCard';
import { getInvoicePaymentPresentation } from '../../api/invoiceSummary';
import { PAYMENT_STATUS_TEXT } from './paymentStatus';
import { formatDisplayDate, getDateLocale, parseSheetDate } from '../../api/dateUtils';

function formatBaht(amount) {
  if (amount == null) return '—';
  return `฿${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CustomerInvoiceList({ invoices, status, onRetry, onViewInvoice }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const sortedInvoices = useMemo(() => [...invoices].sort((a, b) => {
    const aDate = parseSheetDate(a.issuedDate)?.getTime();
    const bDate = parseSheetDate(b.issuedDate)?.getTime();
    if (aDate == null) return bDate == null ? 0 : 1;
    if (bDate == null) return -1;
    return bDate - aDate;
  }), [invoices]);
  const refreshing = status === 'loading' || status === 'refreshing';

  return (
    <SectionCard
      icon="receipt_long"
      title={t('customerOrders.sections.invoices')}
      action={
        <button
          type="button"
          onClick={onRetry}
          disabled={refreshing}
          aria-label={t('customerOrders.refreshInvoices')}
          className="h-[22px] w-[22px] flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className={`material-symbols-outlined text-primary text-[16px] ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true">
            refresh
          </span>
        </button>
      }
    >
      {status === 'loading' && invoices.length === 0 && (
        <p className="px-4 py-4 text-sm text-on-surface-variant" role="status">{t('loading')}</p>
      )}
      {status === 'error' && (
        <div className="px-4 py-4 space-y-2">
          <p className="text-sm text-error" role="alert">{t('customerOrders.invoicesLoadError')}</p>
          <button type="button" onClick={onRetry} className="rounded text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary">
            {t('invoice.retry')}
          </button>
        </div>
      )}
      {['done', 'refreshing'].includes(status) && invoices.length === 0 && (
        <p className="px-4 py-4 text-sm text-on-surface-variant">{t('customerOrders.noInvoices')}</p>
      )}
      {invoices.length > 0 && (
        <ul className="divide-y divide-outline-variant/10">
          {sortedInvoices.map((invoice) => {
            const { canPay, remainingDue, awaitingVerification } = getInvoicePaymentPresentation(invoice);
            const pendingCovered = awaitingVerification && remainingDue === 0;
            const collectable = !['DRAFT', 'CANCELLED', 'VOID'].includes(invoice.status);
            const amount = pendingCovered ? invoice.pendingAmount
              : invoice.status === 'PAID' ? (invoice.paidAmount ?? invoice.grandTotal)
                : collectable ? remainingDue : invoice.grandTotal;
            const hasOutstandingPayment = !pendingCovered && ['UNPAID', 'OVERDUE'].includes(invoice.status);
            const isOverdue = invoice.status === 'OVERDUE';
            const showPay = canPay && status !== 'error'
              && (status === 'done' || invoice.paymentRefreshStatus === 'done');
            return (
              <li key={invoice.invoiceNumber} className="px-4 py-3" aria-busy={invoice.paymentRefreshStatus === 'loading'}>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => onViewInvoice(invoice.invoiceNumber)}
                    aria-label={`${t('customerOrders.viewInvoice')} ${invoice.invoiceNumber}`}
                    className="flex-1 min-w-0 rounded text-left text-primary hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <span className="block truncate font-headline font-bold text-[16px] leading-6">{invoice.invoiceNumber}</span>
                  </button>
                  <dl className="shrink-0 grid grid-cols-[auto_auto] gap-x-0.5 gap-y-0 leading-3 text-on-surface-variant">
                    <dt className="font-label text-[9px] font-bold uppercase tracking-wide">{t('invoice.issuedDate')}</dt>
                    <dd className="font-body text-[10px] whitespace-nowrap">{formatDisplayDate(invoice.issuedDate, undefined, dateLocale)}</dd>
                    <dt className="font-label text-[9px] font-bold uppercase tracking-wide">{t('invoice.dueDate')}</dt>
                    <dd className="font-body text-[10px] whitespace-nowrap">{formatDisplayDate(invoice.dueDate, undefined, dateLocale)}</dd>
                  </dl>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-outline-variant/20">
                  <div className="flex flex-col items-start leading-tight min-w-0">
                    <span className={`font-label text-[9px] font-bold uppercase tracking-wide truncate ${pendingCovered ? 'text-on-surface-variant' : (PAYMENT_STATUS_TEXT[invoice.status] ?? 'text-on-surface-variant')}`}>
                      {pendingCovered ? t('invoice.pay.pendingLabel')
                        : t(`invoice.status.${invoice.status}`, { defaultValue: invoice.status })}
                      {awaitingVerification && !pendingCovered && (
                        <span className="ml-1 font-normal normal-case text-on-surface-variant">
                          {t('customerOrders.invoicePending', { amount: formatBaht(invoice.pendingAmount) })}
                        </span>
                      )}
                    </span>
                    <span className={`max-w-full font-headline font-extrabold text-[13px] truncate ${hasOutstandingPayment ? 'text-on-error-container' : 'text-on-surface'}`}>
                      {formatBaht(amount)}
                      {invoice.paidAmount > 0 && invoice.balanceDue > 0 && (
                        <span className="font-label text-[9px] font-bold text-on-surface-variant">
                          {' '}{t('customerOrders.invoiceOfTotal', { total: formatBaht(invoice.grandTotal) })}
                        </span>
                      )}
                    </span>
                  </div>
                  {showPay && (
                    <button
                      type="button"
                      onClick={() => onViewInvoice(invoice.invoiceNumber)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-headline text-[11px] font-bold hover:opacity-95 active:scale-[0.98] transition-all shrink-0 focus:outline-none focus-visible:ring-2 ${isOverdue ? 'bg-error text-on-error focus-visible:ring-error/60' : 'bg-primary text-on-primary focus-visible:ring-primary/60'}`}
                    >
                      <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">payments</span>
                      {t('invoice.pay.action')}
                    </button>
                  )}
                </div>
                {invoice.paymentRefreshStatus === 'error' && (
                  <p className="mt-1 text-xs text-error">{t('customerOrders.invoiceRefreshError')}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}