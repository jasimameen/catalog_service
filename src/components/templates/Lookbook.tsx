"use client";

import { useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { formatMoney } from "@/lib/catalog/currency";
import { BrandHeader } from "./BrandHeader";

/** Large imagery, generous spacing, for a short, considered list. */
export function LookbookTemplate({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}) {
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const { quantities, increment } = useCart();

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--cat-border)] bg-white/95 px-6 py-3 backdrop-blur">
        <BrandHeader catalog={catalog} />
        <CartButton onClick={onOpenCart} />
      </div>

      <div className="mx-auto max-w-5xl bg-white px-6 py-14 sm:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
          {catalog.name} · Season list
        </p>
        <h1 className="mt-3 max-w-xl text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.06] tracking-tight text-[var(--cat-ink)]">
          Selected for people who care how it looks.
        </h1>

        {catalog.items.length === 0 ? (
          <p className="mt-16 text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
            {catalog.items.map((item, index) => {
              const qty = quantities[item.code] ?? 0;
              return (
                <div key={item.code}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="relative block aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-[var(--cat-photo-bg)]"
                  >
                    {item.image ? (
                      // User-pasted https/data URLs are not in next/image remotePatterns.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        width={800}
                        height={600}
                        loading={index < 2 ? "eager" : "lazy"}
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    ) : null}
                  </button>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-[var(--cat-ink)]">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--cat-muted)]">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4">
                    <span className="text-[17px] font-semibold text-[var(--cat-ink)]">
                      {formatMoney(item.price, catalog.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => increment(item.code)}
                      className="rounded-full border border-[var(--cat-ink)] px-4 py-2 text-[13px] font-medium text-[var(--cat-ink)] hover:bg-slate-50"
                    >
                      {qty > 0 ? `Added × ${qty}` : "Add to order"}
                    </button>
                  </div>
                </div>
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
