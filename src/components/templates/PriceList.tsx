"use client";

import { useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { BrandHeader } from "./BrandHeader";

/** Table layout that prints and exports cleanly — trade pricing by email or on paper. */
export function PriceListTemplate({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}) {
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const { quantities } = useCart();
  const today = new Date();
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--cat-border)] bg-white/95 px-6 py-3 backdrop-blur print:hidden">
        <BrandHeader
          catalog={catalog}
          nameClassName="font-catalog-display text-lg font-bold leading-tight text-[var(--cat-ink)]"
        />
        <CartButton onClick={onOpenCart} />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--cat-ink)] pb-3.5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--cat-ink)]">
              {catalog.name} price list
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--cat-muted)]">
              Valid {monthLabel} · All prices {catalog.currency}, excluding delivery
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,2fr)_90px] gap-3 border-b border-[#d2d2d7] py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--cat-muted)] sm:grid-cols-[110px_minmax(0,2fr)_1fr_90px]">
          <span>Code</span>
          <span>Item</span>
          <span className="hidden sm:block">Pack</span>
          <span className="text-right">Price</span>
        </div>

        {catalog.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : (
          catalog.items.map((item) => {
            const qty = quantities[item.code] ?? 0;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setSelected(item)}
                className="grid w-full grid-cols-[90px_minmax(0,2fr)_90px] items-baseline gap-3 border-b border-[#f0f0f4] py-2.5 text-left text-[13px] sm:grid-cols-[110px_minmax(0,2fr)_1fr_90px]"
              >
                <span className="text-[var(--cat-muted)]">{item.code}</span>
                <span className="font-medium text-[var(--cat-ink)]">
                  {item.name}
                  {qty > 0 && (
                    <span className="ml-1.5 text-[var(--cat-accent)]">× {qty} in order</span>
                  )}
                </span>
                <span className="hidden text-[var(--cat-muted)] sm:block">{item.pack || "1 pc"}</span>
                <span className="text-right font-semibold text-[var(--cat-ink)]">
                  {item.price.toFixed(2)}
                </span>
              </button>
            );
          })
        )}

        <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs text-[var(--cat-muted)] print:hidden">
          <span>Tap any row to add it to your order</span>
          <button type="button" onClick={() => window.print()} className="underline">
            Print / save as PDF
          </button>
        </div>
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
