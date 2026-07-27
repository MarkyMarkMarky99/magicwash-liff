import { useId, useState } from 'react';

/** Pill used for header count badges (e.g. "12 items", "3 orders") and for
 *  header triggers styled to match — see InvoicePreview's payments dropdown. */
export const BADGE_PILL = 'flex items-center bg-surface-container rounded-full px-2.5 h-[22px] font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wider shrink-0 whitespace-nowrap';

/**
 * Canonical section container: white background, rounded-2xl card, a
 * surface-container-low header (icon + title, optional count badge and/or a
 * custom trailing action), and `children` for the divided row content.
 *
 * `badge` and `action` can combine (e.g. a count pill next to a refresh
 * button) — `action` is for anything more interactive than a static pill.
 * `collapsible` restores the interactive section behavior used by the order
 * and item lists without changing the static invoice sections.
 */
export default function SectionCard({ icon, title, badge, action, children, collapsible = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const contentId = `section-card-${useId()}`;
  const heading = (
    <span className="flex items-center gap-2.5 min-w-0">
      <span className="material-symbols-outlined text-primary text-[16px]" aria-hidden="true">{icon}</span>
      {collapsible ? (
        <span role="heading" aria-level="2" className="font-headline font-bold text-[13px] tracking-tight truncate">{title}</span>
      ) : (
        <h2 className="font-headline font-bold text-[13px] tracking-tight truncate">{title}</h2>
      )}
    </span>
  );

  return (
    <section className="bg-white w-full rounded-2xl">
      <div className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between gap-2 rounded-t-2xl">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            className="flex flex-1 min-w-0 items-center justify-between gap-2 text-left text-primary rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {heading}
            <span className="flex items-center gap-2 shrink-0">
              {badge && <span className={BADGE_PILL}>{badge}</span>}
              <span
                className={`material-symbols-outlined text-primary text-[16px] transition-transform ${collapsed ? '' : 'rotate-180'}`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </span>
          </button>
        ) : (
          heading
        )}
        <div className="flex items-center gap-2 shrink-0">
          {!collapsible && badge && <span className={BADGE_PILL}>{badge}</span>}
          {action}
        </div>
      </div>
      <div id={contentId} hidden={collapsible && collapsed} className="rounded-b-2xl overflow-hidden">{children}</div>
    </section>
  );
}
