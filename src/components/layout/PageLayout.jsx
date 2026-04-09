export default function PageLayout({ footer, scrollable = false, children }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden font-body text-on-surface w-full">
      <main className={`flex-1 ${scrollable ? 'overflow-y-auto no-scrollbar' : 'overflow-hidden'}`}>
        {children}
      </main>

      {footer && (
        <footer className="flex-none p-4 bg-surface border-t border-outline-variant/20 z-50">
          {footer}
        </footer>
      )}
    </div>
  );
}
