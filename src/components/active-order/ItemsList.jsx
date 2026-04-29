import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function formatBaht(n) {
  if (n == null) return '—';
  return `฿${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ItemsList({ items = [] }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="bg-white w-full rounded-2xl overflow-hidden">
      {/* Section heading — matches OrderList style */}
      <div
        className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[16px]">checkroom</span>
          <h2 className="font-headline font-bold text-[13px] tracking-tight">
            {t('activeOrder.items.title')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-container rounded-full px-2.5 h-[22px]">
            <span className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
              {items.length} {t('activeOrder.items.count')}
            </span>
          </div>
          <span className={`material-symbols-outlined text-primary text-[16px] transition-transform ${collapsed ? '' : 'rotate-180'}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* Empty */}
      {!collapsed && items.length === 0 && (
        <p className="px-6 py-4 text-sm text-on-surface-variant italic">
          {t('activeOrder.items.empty')}
        </p>
      )}

      {/* Rows */}
      {!collapsed && items.length > 0 && (
        <ul className="divide-y divide-outline-variant/10">
          {items.map((item) => {
            const lineTotal = (item.price ?? 0) * (item.quantity ?? 0);
            return (
              <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-on-surface font-medium leading-tight truncate">
                    {item.description || '—'}
                  </p>
                  <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                    {item.quantity} × {formatBaht(item.price)}
                  </p>
                </div>
                <span className="font-headline text-[13px] font-bold text-on-surface shrink-0">
                  {formatBaht(lineTotal)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
