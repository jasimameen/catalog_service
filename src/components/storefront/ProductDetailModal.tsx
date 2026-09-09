"use client";

import type { StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { formatMoney } from "@/lib/catalog/currency";

const QUICK_MULTIPLES = [6, 12, 24];

export function ProductDetailModal({
  item,
  currency,
  onClose,
}: {
  item: StorefrontItem;
  currency: string;
  onClose: () => void;
}) {
  const { quantities, increment, decrement, setQuantity } = useCart();
  const qty = quantities[item.code] ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[584/480] w-full shrink-0 bg-[var(--cat-photo-bg)] sm:aspect-auto sm:w-1/2">
          {item.image ? (
            // User-pasted https/data URLs are not in next/image remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              width={584}
              height={480}
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--cat-muted)]">
              No photo yet
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-lg leading-none text-[var(--cat-muted)] shadow hover:bg-white"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          <div>
            <h2 className="font-catalog-display text-xl font-bold text-[var(--cat-ink)]">
              {item.name}
            </h2>
            {item.code && <p className="text-sm text-[var(--cat-muted)]">{item.code}</p>}
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-[var(--cat-muted)]">{item.description}</p>
          )}

          <div className="mt-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--cat-muted)]">
              {currency}
            </p>
            <p className="text-2xl font-bold text-[var(--cat-ink)]">{item.price.toFixed(2)}</p>
            {qty > 0 && (
              <p className="text-xs text-[var(--cat-muted)]">
                × {qty} = {formatMoney(item.price * qty, currency)}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-2 pt-2">
            {qty === 0 ? (
              <button
                type="button"
                onClick={() => increment(item.code)}
                className="w-full rounded-[9px] border border-[var(--cat-accent)] bg-white py-2.5 text-sm font-semibold text-[var(--cat-accent)] transition hover:bg-slate-50"
              >
                Add to order
              </button>
            ) : (
              <>
                <div className="flex items-stretch overflow-hidden rounded-[9px] border border-[var(--cat-border)]">
                  <button
                    type="button"
                    onClick={() => decrement(item.code)}
                    aria-label={`Remove one ${item.name}`}
                    className="flex-1 border-r border-[var(--cat-border)] py-2.5 text-base font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="flex-1 py-2.5 text-center text-sm font-semibold text-[var(--cat-ink)]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => increment(item.code)}
                    aria-label={`Add one more ${item.name}`}
                    className="flex-1 border-l border-[var(--cat-border)] py-2.5 text-base font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {QUICK_MULTIPLES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(item.code, n)}
                      className="flex-1 rounded-full bg-slate-100 py-1 text-xs font-medium text-[var(--cat-muted)] hover:bg-slate-200"
                    >
                      ×{n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
