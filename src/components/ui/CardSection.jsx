import { useState, Children } from 'react';

/**
 * Generic collapsible section container.
 *
 * Props:
 *   title       {string}    Section heading text
 *   icon        {string}    Material Symbols icon name shown in header
 *   count       {number}    Optional badge count shown in header
 *   onRefresh   {fn}        Optional — renders a refresh button when provided
 *   refreshing  {boolean}   Spins the refresh icon and disables the button
 *   limit       {number}    Max items to show before hiding the rest
 *   onViewAll   {fn}        Called when the built-in "view all" footer button is tapped
 *                           Only shown when limit is set and there are hidden items
 *   footer      {ReactNode} Custom footer slot — overrides the built-in view-all button
 *   emptyText   {string}    Text shown when there are no children
 *   children    {ReactNode} Card items — any component
 */
export default function CardSection({
  title,
  icon,
  count,
  onRefresh,
  refreshing = false,
  limit,
  onViewAll,
  footer,
  emptyText = 'ไม่มีข้อมูล',
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const allItems     = Children.toArray(children);
  const hasLimit     = limit != null && allItems.length > limit;
  const visibleItems = hasLimit ? allItems.slice(0, limit) : allItems;

  // Footer priority: custom slot > built-in view-all > nothing
  const footerContent = footer ?? (
    hasLimit && onViewAll ? (
      <button
        onClick={onViewAll}
        className="w-full flex items-center justify-center gap-1.5 py-2.5
                   text-primary font-label text-[12px] font-bold tracking-wide
                   hover:bg-surface-container-low active:bg-surface-container
                   transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">expand_circle_down</span>
        ดูทั้งหมด {allItems.length} รายการ
      </button>
    ) : null
  );

  return (
    <section className="bg-white w-full">

      {/* Header */}
      <div
        className="px-4 py-2 bg-surface-container-low text-primary flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
          <h2 className="font-headline font-bold text-[13px] tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {count != null && (
            <div className="flex items-center gap-1.5 bg-surface-container rounded-full px-2.5 h-[22px]">
              <span className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
                {count} orders
              </span>
            </div>
          )}
          {onRefresh && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              disabled={refreshing}
              className="h-[22px] w-[22px] flex items-center justify-center rounded-full
                         hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-primary text-[16px] ${refreshing ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
          )}
          <span className={`material-symbols-outlined text-on-surface-variant text-[16px] transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <>
          {allItems.length === 0 ? (
            <p className="px-6 py-4 text-sm text-on-surface-variant italic">{emptyText}</p>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {visibleItems}
            </div>
          )}

          {/* Footer — only when there are items */}
          {allItems.length > 0 && footerContent && (
            <div className="border-t border-outline-variant/10">
              {footerContent}
            </div>
          )}
        </>
      )}

    </section>
  );
}
