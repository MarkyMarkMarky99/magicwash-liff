export default function FormHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 transition-transform hover:scale-105">
        <span className="material-symbols-outlined text-[28px] text-primary">{icon}</span>
      </div>
      <div>
        <h2 className="font-headline font-extrabold text-2xl text-primary leading-tight">{title}</h2>
        {subtitle && <p className="font-body text-sm text-on-surface-variant/80 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
