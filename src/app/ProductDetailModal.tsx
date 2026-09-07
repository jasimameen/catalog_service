"use client";

import Image from "next/image";
import type { Product } from "@/data/catalog-products";
import { useCart } from "@/lib/catalog/cart-context";

const QUICK_MULTIPLES = [6, 12, 24];

export function ProductDetailModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { quantities, increment, decrement, setQuantity } = useCart();
  const qty = quantities[product.code] ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[584/480] w-full shrink-0 bg-[var(--kl-photo-bg)] sm:aspect-auto sm:w-1/2">
          <Image
            src={product.image}
            alt={product.category}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-contain"
            priority
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-lg leading-none text-[var(--kl-muted)] shadow hover:bg-white"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          <div>
            <h2 className="font-catalog-display text-xl font-bold text-[var(--kl-ink)]">
              {product.category}
            </h2>
            <p className="text-sm text-[var(--kl-muted)]">{product.code}</p>
          </div>

          <p className="text-sm leading-relaxed text-[var(--kl-muted)]">{product.description}</p>

          <div className="rounded-[9px] border border-[var(--kl-border)] px-3 py-2 text-xs text-[var(--kl-muted)]">
            Barcode: {product.barcode}
          </div>

          <div className="mt-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--kl-muted)]">
              QAR
            </p>
            <p className="text-2xl font-bold text-[var(--kl-ink)]">{product.price.toFixed(2)}</p>
            {qty > 0 && (
              <p className="text-xs text-[var(--kl-muted)]">
                × {qty} = QAR {(product.price * qty).toFixed(2)}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-2 pt-2">
            {qty === 0 ? (
              <button
                type="button"
                onClick={() => increment(product.code)}
                className="w-full rounded-[9px] border border-[var(--kl-blue)] bg-white py-2.5 text-sm font-semibold text-[var(--kl-blue)] transition hover:bg-blue-50"
              >
                Add to order
              </button>
            ) : (
              <>
                <div className="flex items-stretch overflow-hidden rounded-[9px] border border-[var(--kl-border)]">
                  <button
                    type="button"
                    onClick={() => decrement(product.code)}
                    aria-label={`Remove one ${product.category}`}
                    className="flex-1 border-r border-[var(--kl-border)] py-2.5 text-base font-semibold text-[var(--kl-ink)] hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="flex-1 py-2.5 text-center text-sm font-semibold text-[var(--kl-ink)]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => increment(product.code)}
                    aria-label={`Add one more ${product.category}`}
                    className="flex-1 border-l border-[var(--kl-border)] py-2.5 text-base font-semibold text-[var(--kl-ink)] hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {QUICK_MULTIPLES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(product.code, n)}
                      className="flex-1 rounded-full bg-slate-100 py-1 text-xs font-medium text-[var(--kl-muted)] hover:bg-slate-200"
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
