"use client";

import { useState, type ReactNode } from "react";
import { CatalogSlots } from "./CatalogSlots";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { ComboBadge } from "@/components/storefront/ComboBadge";
import { ComboIncludes } from "@/components/storefront/ComboIncludes";
import { PausedNote } from "@/components/storefront/PausedNote";
import { optionsCue } from "@/lib/catalog/item-options";
import { BrandHeader } from "./BrandHeader";
import { isItemAvailable } from "@/lib/catalog/merchandising";

/** Table layout that prints and exports cleanly — trade pricing by email or on paper. */
export function PriceListTemplate({
  catalog,
  onOpenCart,
  filters,
  featured,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
  filters?: ReactNode;
  featured?: ReactNode;
}) {
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const { quantities, acceptOrders, pausedMessage } = useCart();
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

      <CatalogSlots filters={filters} featured={featured} />

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

        {!acceptOrders ? (
          <div className="mt-4 print:hidden">
            <PausedNote message={pausedMessage} />
          </div>
        ) : null}

        <div className="hidden grid-cols-[110px_minmax(0,2fr)_1fr_90px] gap-3 border-b border-[#d2d2d7] py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--cat-muted)] @md:grid">
          <span>Code</span>
          <span>Item</span>
          <span>Pack</span>
          <span className="text-right">Price</span>
        </div>

        {catalog.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : (
          catalog.items.map((item) => {
            const qty = quantities[item.code] ?? 0;
            const available = isItemAvailable(item);
            const cue = item.isCombo ? null : optionsCue(item);
            return (
              <div
                key={item.code}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(item);
                  }
                }}
                className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 border-b border-[#f0f0f4] py-2.5 text-left text-[13px] @md:grid-cols-[110px_minmax(0,2fr)_1fr_90px] ${
                  available ? "" : "opacity-55"
                }`}
              >
                <span className="col-start-1 row-start-2 text-[12px] text-[var(--cat-muted)] @md:row-start-1 @md:text-[13px]">
                  <span className="@md:hidden">
                    {item.code}
                    {item.pack ? ` · ${item.pack}` : ""}
                  </span>
                  <span className="hidden @md:inline">{item.code}</span>
                </span>
                <span className="col-start-1 row-start-1 min-w-0 @md:col-start-2">
                  <span className="flex flex-wrap items-center gap-1.5 font-medium text-[var(--cat-ink)]">
                    {item.name}
                    {item.isCombo ? <ComboBadge className="print:hidden" /> : null}
                    {!available ? (
                      <span className="text-[var(--cat-muted)]">Unavailable</span>
                    ) : qty > 0 ? (
                      <span className="text-[var(--cat-accent)] print:hidden">× {qty} in order</span>
                    ) : null}
                  </span>
                  {item.isCombo ? (
                    <ComboIncludes lines={item.comboIncludes} layout="list" size="sm" className="mt-1 @md:pl-3" />
                  ) : cue ? (
                    <span className="mt-0.5 block text-[12px] text-[var(--cat-accent)]">{cue}</span>
                  ) : null}
                </span>
                <span className="hidden text-[var(--cat-muted)] @md:col-start-3 @md:row-start-1 @md:block">
                  {item.pack || "1 pc"}
                </span>
                <span className="col-start-2 row-start-1 text-right font-semibold text-[var(--cat-ink)] @md:col-start-4">
                  {item.price.toFixed(2)}
                </span>
              </div>
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
