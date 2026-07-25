export default function DateChip({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-label text-[9px] text-on-surface-variant font-bold uppercase tracking-wide whitespace-nowrap">
        {label}
      </p>
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 font-headline text-[11px] font-bold text-primary whitespace-nowrap">
        {value}
      </span>
    </div>
  );
}
