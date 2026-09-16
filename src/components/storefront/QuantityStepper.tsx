"use client";

export function QuantityStepper({
  qty,
  onDecrement,
  onIncrement,
  label,
}: {
  qty: number;
  onDecrement: () => void;
  onIncrement: () => void;
  label: string;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-[10px] border border-[var(--cat-border)]">
      <button
        type="button"
        onClick={onDecrement}
        aria-label={`Remove one ${label}`}
        className="flex h-11 min-w-11 items-center justify-center px-3 text-lg font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
      >
        −
      </button>
      <span className="flex min-w-10 flex-1 items-center justify-center text-sm font-semibold text-[var(--cat-ink)]">
        {qty}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Add one more ${label}`}
        className="flex h-11 min-w-11 items-center justify-center px-3 text-lg font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
      >
        +
      </button>
    </div>
  );
}
