"use client";

import Image from "next/image";
import type { Product } from "@/data/catalog-products";
import { useCart } from "@/lib/catalog/cart-context";

const QUICK_MULTIPLES = [6, 12, 24];

export function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  const { quantities, increment, decrement, setQuantity } = useCart();
  const qty = quantities[product.code] ?? 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-[var(--kl-border)] bg-[var(--kl-surface)] shadow-sm">
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="relative aspect-[584/480] w-full bg-[var(--kl-photo-bg)]"
        aria-label={`View details for ${product.category}`}
      >
        <Image
          src={product.image}
          alt={product.category}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
          className="object-contain"
        />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={() => onSelect(product)} className="text-left">
          <p className="text-[15px] font-semibold leading-tight text-[var(--kl-ink)]">
            {product.category}
          </p>
          <p className="text-xs text-[var(--kl-muted)]">{product.code}</p>
        </button>
        <p className="kl-line-clamp-2 text-xs text-[var(--kl-muted)]">{product.description}</p>

        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--kl-muted)]">
              QAR
            </p>
            <p className="text-lg font-bold text-[var(--kl-ink)]">{product.price.toFixed(2)}</p>
          </div>
          {qty > 0 && (
            <p className="text-xs text-[var(--kl-muted)]">
              × {qty} = {(product.price * qty).toFixed(2)}
            </p>
          )}
        </div>

        {qty === 0 ? (
          <button
            type="button"
            onClick={() => increment(product.code)}
            className="w-full rounded-[9px] border border-[var(--kl-blue)] bg-white py-2 text-sm font-semibold text-[var(--kl-blue)] transition hover:bg-blue-50 active:scale-[0.98]"
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
                className="flex-1 border-r border-[var(--kl-border)] py-2 text-base font-semibold text-[var(--kl-ink)] hover:bg-slate-50"
              >
                −
              </button>
              <span className="flex-1 py-2 text-center text-sm font-semibold text-[var(--kl-ink)]">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => increment(product.code)}
                aria-label={`Add one more ${product.category}`}
                className="flex-1 border-l border-[var(--kl-border)] py-2 text-base font-semibold text-[var(--kl-ink)] hover:bg-slate-50"
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
  );
}
