/**
 * ConfirmationLayout
 *
 * Full-screen confirmation page structure:
 *   ┌─────────────────────────────┐
 *   │  hero (teal gradient)       │
 *   │    icon · title · subtitle  │
 *   ├─────────────────────────────┤
 *   │  scrollable body            │
 *   │    sectionLabel             │  ← tightly grouped with detailCard
 *   │    detailCard               │
 *   │    metaRow  (card)          │
 *   │    locationLabel            │  ← tightly grouped with locationRow
 *   │    locationRow              │
 *   │    mapArea                  │
 *   ├─────────────────────────────┤
 *   │  footer (text action)       │
 *   └─────────────────────────────┘
 *
 * Every section is a named prop — pass null to omit.
 */
export default function ConfirmationLayout({
  // Hero slots
  icon,
  title,
  reference,
  subtitle,

  // Body slots
  sectionLabel,
  detailCard,
  metaRow,
  locationLabel,
  locationRow,
  mapArea,

  // Footer slot
  action,
}) {
  return (
    <div className="flex flex-col h-full w-full font-body text-on-surface bg-surface">

      {/* ── Hero ── */}
      <div
        className="flex-none flex flex-col items-center justify-end pb-10 pt-14 px-6 text-center rounded-b-[40px]"
        style={{ background: 'linear-gradient(160deg, #00897b 0%, #26c6b0 100%)' }}
      >
        {icon && (
          <div className="mb-5">
            {icon}
          </div>
        )}
        {title && (
          <h1 className="font-headline text-[22px] font-bold text-white leading-tight">
            {title}
          </h1>
        )}
        {reference && (
          <p className="mt-1.5 text-xs text-white/60 tracking-wide">
            {reference}
          </p>
        )}
        {subtitle && (
          <p className="mt-2.5 text-sm text-white/75 max-w-[240px] leading-snug">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-5 pb-4 flex flex-col gap-4">

        {/* Appointment section: label + detail card tightly grouped */}
        {(sectionLabel || detailCard) && (
          <div className="flex flex-col gap-2">
            {sectionLabel && (
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
                {sectionLabel}
              </p>
            )}
            {detailCard && (
              <div>
                {detailCard}
              </div>
            )}
          </div>
        )}

        {/* Time / meta row — card style */}
        {metaRow && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/25 px-4 py-3 flex items-center gap-3">
            {metaRow}
          </div>
        )}

        {/* Location section: label + row tightly grouped */}
        {(locationLabel || locationRow) && (
          <div className="flex flex-col gap-1.5">
            {locationLabel && (
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
                {locationLabel}
              </p>
            )}
            {locationRow && (
              <div>
                {locationRow}
              </div>
            )}
          </div>
        )}

        {/* Map / visual area */}
        {mapArea && (
          <div className="rounded-2xl overflow-hidden border border-outline-variant/20 h-40">
            {mapArea}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {action && (
        <div className="flex-none px-6 pb-8 pt-3 border-t border-outline-variant/20">
          {action}
        </div>
      )}
    </div>
  );
}
