function readText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default function CustomerDetailsCard({ label, customer, customerCode, customerCodeLabel, customerType, customerTypeLabel }) {
  if (!customer) return null;

  const firstName = readText(customer.firstName);
  const lastName = readText(customer.lastName);
  const displayName = readText(customer.customerName)
    ?? ([firstName, lastName].filter(Boolean).join(' ') || '–');
  const phone = readText(customer.phone);
  const email = readText(customer.email);
  const address = readText(customer.address);
  const type = readText(customerType);

  return (
    <section className="relative border border-outline-variant/40 rounded-2xl px-4 pt-6 pb-4">
      <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide whitespace-nowrap">
        {label}
      </p>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-headline font-bold text-[15px] text-primary leading-snug">
            {displayName}
          </h3>
          {customerCode && (
            <p className="font-label text-[10px] text-on-surface-variant font-bold tracking-wide mt-0.5">
              {customerCodeLabel} · {customerCode}
            </p>
          )}
          {phone && (
            <div className="flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-on-surface-variant text-[14px] leading-none" aria-hidden="true">call</span>
              <p className="font-body text-[11px] text-on-surface-variant">{phone}</p>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-on-surface-variant text-[14px] leading-none" aria-hidden="true">mail</span>
              <p className="font-body text-[11px] text-on-surface-variant truncate">{email}</p>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-1 mt-0.5">
              <span className="material-symbols-outlined text-on-surface-variant text-[14px] leading-none mt-px" aria-hidden="true">location_on</span>
              <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
                {address}
              </p>
            </div>
          )}
        </div>
        {type && customerTypeLabel && (
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-widest whitespace-nowrap">
              {customerTypeLabel}
            </p>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary">
              {type}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
