export function ComboBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full bg-[var(--cat-ink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${className}`}
    >
      Combo
    </span>
  );
}
