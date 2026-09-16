"use client";

import { useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { formatMoney } from "@/lib/catalog/currency";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";
import { hasItemOptions } from "@/lib/catalog/item-options";
import { useCart } from "@/lib/catalog/cart-context";
import { ProductDetailModal } from "./ProductDetailModal";

export function FeaturedStrip({ catalog }: { catalog: StorefrontCatalog }) {
  const featured = catalog.items.filter((item) => item.featured);
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const { quantities, increment } = useCart();

  if (featured.length === 0) return null;

  return (
    <section className="border-b border-[var(--cat-border)] bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
          Featured
        </p>
        <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {featured.map((item) => {
            const available = isItemAvailable(item);
            const qty = quantities[item.code] ?? 0;
            return (
              <article
                key={item.id}
                className="w-[168px] shrink-0 snap-start overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-[var(--cat-surface)]"
              >
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="relative block aspect-square w-full bg-[var(--cat-photo-bg)]"
                  aria-label={`View details for ${item.name}`}
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      width={168}
                      height={168}
                      loading="lazy"
                      decoding="async"
                      className={`absolute inset-0 h-full w-full ${imageFitClass(item.imageFit)}`}
                    />
                  ) : null}
                  {!available ? (
                    <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/65 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                      Unavailable
                    </span>
                  ) : null}
                </button>
                <div className="p-2.5">
                  <p className="truncate text-[13px] font-semibold text-[var(--cat-ink)]">{item.name}</p>
                  <p className="mt-1 text-[13px] font-bold text-[var(--cat-ink)]">
                    {formatMoney(item.price, catalog.currency)}
                  </p>
                  {available ? (
                    <button
                      type="button"
                      onClick={() => (hasItemOptions(item) ? setSelected(item) : increment(item.code))}
                      className="mt-2 min-h-9 w-full rounded-[8px] bg-[var(--cat-accent)] text-[12px] font-semibold text-white"
                    >
                      {qty > 0 ? `Added × ${qty}` : hasItemOptions(item) ? "Options" : "Add"}
                    </button>
                  ) : (
                    <p className="mt-2 text-[11px] font-medium text-[var(--cat-muted)]">Unavailable</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {selected ? (
        <ProductDetailModal
          item={selected}
          currency={catalog.currency}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
