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
 */
export default function SectionCard({ icon, title, badge, action, children }) {
  return (
    <section className="bg-white w-full rounded-2xl">
      <div className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between gap-2 rounded-t-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-primary text-[16px]" aria-hidden="true">{icon}</span>
          <h2 className="font-headline font-bold text-[13px] tracking-tight truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && <span className={BADGE_PILL}>{badge}</span>}
          {action}
        </div>
      </div>
      <div className="rounded-b-2xl overflow-hidden">{children}</div>
    </section>
  );
}
