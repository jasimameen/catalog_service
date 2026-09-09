"use client";

import { useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { formatMoney } from "@/lib/catalog/currency";
import { BrandHeader } from "./BrandHeader";

/** Large editorial image cards — one or two across. */
export function CardsTemplate({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}) {
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const { quantities, increment } = useCart();

  return (
    <div className="bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--cat-border)] bg-white/95 px-5 py-3 backdrop-blur">
        <BrandHeader catalog={catalog} />
        <CartButton onClick={onOpenCart} />
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {catalog.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {catalog.items.map((item, index) => {
              const qty = quantities[item.code] ?? 0;
              return (
                <article
                  key={item.code}
                  className="overflow-hidden rounded-[18px] border border-[var(--cat-border)] bg-[var(--cat-surface)] shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="relative block aspect-[16/10] w-full bg-[var(--cat-photo-bg)]"
                    aria-label={`View details for ${item.name}`}
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        width={960}
                        height={600}
                        loading={index < 2 ? "eager" : "lazy"}
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    ) : null}
                  </button>
                  <div className="px-5 pb-5 pt-4">
                    {item.code ? (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                        {item.code}
                      </p>
                    ) : null}
                    <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--cat-ink)]">
                      {item.name}
                    </h2>
                    {item.description ? (
                      <p className="mt-2 text-[14px] leading-relaxed text-[var(--cat-muted)]">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="text-[18px] font-semibold text-[var(--cat-ink)]">
                        {formatMoney(item.price, catalog.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => increment(item.code)}
                        className="rounded-full bg-[var(--cat-accent)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                      >
                        {qty > 0 ? `Added × ${qty}` : "Add to order"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <ProductDetailModal
          item={selected}
          currency={catalog.currency}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
