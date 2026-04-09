export default function CustomerCard({ customer }) {
  const displayName = customer?.customerName
    || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
  const displayAddress = (customer?.address || '').split(',')[0].trim();

  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 overflow-hidden">
          <span className="material-symbols-outlined fill-icon text-[48px] text-outline-variant translate-y-1">
            account_circle
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-headline font-bold text-base text-primary leading-tight truncate">
            {displayName || '–'}
          </h3>
          {customer?.phone && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>call</span>
              <p className="font-body text-xs text-on-surface-variant">{customer.phone}</p>
            </div>
          )}
          {displayAddress && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>location_on</span>
              <p className="font-body text-xs text-on-surface-variant truncate">{displayAddress}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-outline-variant/20">
        <p className="font-body text-xs text-on-surface-variant">
          รหัสลูกค้า:{' '}
          <span className="font-medium text-on-surface">{customer?.customerId || '–'}</span>
        </p>
      </div>
    </div>
  );
}
