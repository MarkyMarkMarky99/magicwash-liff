import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const SERVICE_TYPES = [
  { id: 'express', multiplier: 2.0, labelKey: 'activeOrder.cost.service.express.label', descKey: 'activeOrder.cost.service.express.desc' },
  { id: 'regular', multiplier: 1.5, labelKey: 'activeOrder.cost.service.regular.label', descKey: 'activeOrder.cost.service.regular.desc' },
  { id: 'saver',   multiplier: 1.0, labelKey: 'activeOrder.cost.service.saver.label',   descKey: 'activeOrder.cost.service.saver.desc' },
];

export function calculateCost(items = [], taxRate = 0.07, discountAmount = 0, serviceMultiplier = 1) {
  const base = items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 0), 0);
  const subtotal = Math.round(base * serviceMultiplier * 100) / 100;
  const discount = Math.min(Math.max(discountAmount, 0), subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * taxRate * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  return { subtotal, discount, tax, total };
}

function formatBaht(n) {
  if (n == null) return '—';
  return `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CostSummary({ items = [], voucher, onApplyVoucher, onRemoveVoucher, serviceType = 'regular', onServiceTypeChange }) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const serviceMultiplier = SERVICE_TYPES.find(s => s.id === serviceType)?.multiplier ?? 1;
  const discountAmount = voucher?.discountAmount ?? 0;
  const { subtotal, discount, tax, total } = calculateCost(items, 0.07, discountAmount, serviceMultiplier);

  const handleApply = () => {
    const code = input.trim().toUpperCase();
    if (!code) return;
    const success = onApplyVoucher(code);
    if (success) {
      setInput('');
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleRemove = () => {
    onRemoveVoucher();
    setInput('');
    setError(false);
  };

  return (
    <section>
      <p className="font-label text-[10px] text-primary font-bold uppercase tracking-widest mb-1">
        {t('activeOrder.cost.title')}
      </p>

      {/* Service Type Radio Buttons */}
      <div className="space-y-2 mb-3">
        {SERVICE_TYPES.map(st => {
          const active = serviceType === st.id;
          return (
            <label
              key={st.id}
              className="flex gap-2.5 cursor-pointer"
              onClick={() => onServiceTypeChange?.(st.id)}
            >
              <div className={`mt-0.5 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                active ? 'border-primary' : 'border-outline-variant'
              }`}>
                {active && <div className="w-[7px] h-[7px] rounded-full bg-primary" />}
              </div>
              <div className="min-w-0">
                <p className={`font-label text-[12px] font-bold uppercase tracking-wide leading-tight ${active ? 'text-primary' : 'text-on-surface'}`}>
                  {t(st.labelKey)}
                </p>
                <p className="font-body text-[11px] text-on-surface-variant leading-snug mt-0.5">
                  {t(st.descKey)}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-between py-0.5">
        <span className="font-body text-[13px] text-on-surface-variant">{t('activeOrder.cost.subtotal')}</span>
        <span className="font-body text-[13px] text-on-surface">{formatBaht(subtotal)}</span>
      </div>

      {/* VAT */}
      <div className="flex items-center justify-between py-0.5">
        <span className="font-body text-[13px] text-on-surface-variant">{t('activeOrder.cost.tax')}</span>
        <span className="font-body text-[13px] text-on-surface">{formatBaht(tax)}</span>
      </div>

      {/* Voucher — applied state */}
      {voucher && (
        <div className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] leading-none" style={{ color: '#16a34a' }}>confirmation_number</span>
            <span className="font-body text-[13px]" style={{ color: '#15803d' }}>{voucher.code}</span>
            <button onClick={handleRemove} className="text-on-surface-variant hover:text-error transition-colors ml-0.5">
              <span className="material-symbols-outlined text-[13px] leading-none">close</span>
            </button>
          </div>
          <span className="font-body text-[13px]" style={{ color: '#15803d' }}>-{formatBaht(discount)}</span>
        </div>
      )}

      {/* Voucher — input state */}
      {!voucher && (
        <div className="py-1.5">
          <div className={`flex items-center gap-2 rounded-xl border px-3 h-9 transition-colors ${
            error ? 'border-error bg-error/5' : 'border-outline-variant/50 bg-surface-container/40'
          }`}>
            <span className="material-symbols-outlined text-on-surface-variant text-[14px] leading-none">confirmation_number</span>
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder={t('activeOrder.cost.voucherPlaceholder')}
              className="flex-1 bg-transparent font-body text-[12px] text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              style={{ textTransform: 'uppercase' }}
            />
            <button
              onClick={handleApply}
              disabled={!input.trim()}
              className="font-label text-[11px] font-bold text-primary disabled:text-on-surface-variant/35 transition-colors shrink-0"
            >
              {t('activeOrder.cost.applyVoucher')}
            </button>
          </div>
          {error && (
            <p className="mt-1 font-body text-[11px] text-error">{t('activeOrder.cost.invalidVoucher')}</p>
          )}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-3">
        <span className="font-headline text-[14px] font-bold text-on-surface">{t('activeOrder.cost.total')}</span>
        <span className="font-headline text-[18px] font-bold text-primary">{formatBaht(total)}</span>
      </div>
    </section>
  );
}
