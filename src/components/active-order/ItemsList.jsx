import { useTranslation } from 'react-i18next';
import SectionCard from '../ui/SectionCard';

function formatBaht(n) {
  if (n == null) return '—';
  return `฿${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ItemsList({ items = [] }) {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon="checkroom"
      title={t('activeOrder.items.title')}
      badge={`${items.length} ${t('activeOrder.items.count')}`}
    >
      {items.length === 0 ? (
        <p className="px-6 py-4 text-sm text-on-surface-variant italic">
          {t('activeOrder.items.empty')}
        </p>
      ) : (
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
    </SectionCard>
  );
}
