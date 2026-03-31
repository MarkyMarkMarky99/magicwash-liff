export default function PageLayout({ title, footer, scrollable = false, children }) {
  return (
    <div className="h-full flex flex-col relative overflow-hidden font-body text-on-surface w-full">
      <header className="flex-none bg-primary text-on-primary px-4 py-3 flex items-center shadow-md z-50">
        <h1 className="text-lg font-headline font-bold tracking-tight">{title}</h1>
      </header>

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
