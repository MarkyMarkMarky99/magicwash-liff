import './BottomNavBar.css';

/**
 * Controlled navigation: items are { key, label, icon } with translated labels.
 * onSelect(key) lets the parent change activeKey without coupling to a router.
 * renderIcon(item, active) replaces the default Material Symbol when provided.
 * Place after scrollable content with 56px bottom padding for the overlapping edge.
 */
export default function BottomNavBar({ items, activeKey, ariaLabel, onSelect, renderIcon }) {
  return (
    <nav className="bottom-nav-bar" aria-label={ariaLabel}>
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key} className="min-w-0 flex-1">
              <button
                type="button"
                className={`bottom-nav-bar__item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect(item.key)}
              >
                <span key={active ? `${item.key}-on` : item.key} className="bottom-nav-bar__icon">
                  {renderIcon ? renderIcon(item, active) : (
                    <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                </span>
                <span className="bottom-nav-bar__label">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}