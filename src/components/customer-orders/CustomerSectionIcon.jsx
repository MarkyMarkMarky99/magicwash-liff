/** Customer section SVGs copied from the Vue customer navigation. */
export default function CustomerSectionIcon({ name }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      {name === 'orders' && (
        <>
          <rect x="4" y="3.5" width="20" height="21" rx="4.5" />
          <path d="M8.5 8h.1M12.5 8h.1" />
          <circle cx="14" cy="16" r="5" />
        </>
      )}
      {name === 'packages' && (
        <path d="M4 7h20v4.5a2.5 2.5 0 0 0 0 5V21H4v-4.5a2.5 2.5 0 0 0 0-5z" />
      )}
      {name === 'invoices' && (
        <>
          <path d="M7.5 3.5h9l4.5 4.5v16.5H7.5z" />
          <path d="M16.5 3.5V8H21M11 14h6M11 18.5h4" />
        </>
      )}
      {name === 'appointments' && (
        <>
          <rect x="4" y="5.5" width="20" height="18.5" rx="3.5" />
          <path d="M9 3.5v4M19 3.5v4M4 11h20" />
          <rect x="14.5" y="14.5" width="5" height="5" rx="1.3" />
        </>
      )}
    </svg>
  );
}