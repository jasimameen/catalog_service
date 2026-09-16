"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CatalogSlots } from "./CatalogSlots";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { formatMoney } from "@/lib/catalog/currency";
import { hasItemOptions } from "@/lib/catalog/item-options";
import { BrandHeader } from "./BrandHeader";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";

/** Sectioned food menu — photos use cover by default. */
export function MenuTemplate({
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
  const { quantities, increment, decrement, acceptOrders } = useCart();

  const sections = useMemo(() => {
    const order: string[] = [];
    const grouped = new Map<string, StorefrontItem[]>();
    for (const item of catalog.items) {
      const group = item.category.trim() || "Menu";
      if (!grouped.has(group)) {
        grouped.set(group, []);
        order.push(group);
      }
      grouped.get(group)!.push(item);
    }
    return order.map((group) => ({ group, items: grouped.get(group)! }));
  }, [catalog.items]);

  return (
    <div style={{ background: "#fffdf8" }}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e6e0d3] bg-[#fffdf8]/95 px-6 py-3 backdrop-blur">
        <BrandHeader
          catalog={catalog}
          nameClassName="font-catalog-display text-lg font-bold leading-tight text-[var(--cat-ink)]"
        />
        <CartButton onClick={onOpenCart} />
      </div>

      <CatalogSlots filters={filters} featured={featured} />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <div className="border-b border-[#e6e0d3] pb-6 text-center">
          <h1 className="text-[26px] font-semibold uppercase tracking-[0.02em] text-[var(--cat-ink)]">
            {catalog.name}
          </h1>
          <p className="mt-2 text-[13px] text-[#8a8171]">
            Prices in {catalog.currency} · Tap any line to add it to your order
          </p>
        </div>

        {catalog.items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#8a8171]">No items yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2">
            {sections.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8171]">
                  {group}
                </p>
                {items.map((item) => {
                  const qty = quantities[item.code] ?? 0;
                  const available = isItemAvailable(item);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        if (!available) return;
                        if (!acceptOrders || hasItemOptions(item)) {
                          setSelected(item);
                          return;
                        }
                        if (qty > 0) decrement(item.code);
                        else increment(item.code);
                      }}
                      className={`flex min-h-14 w-full items-center gap-3 border-b border-dotted border-[#ddd5c5] py-2.5 text-left ${
                        available ? "" : "opacity-55"
                      }`}
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f3eee4]">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt=""
                            width={56}
                            height={56}
                            loading="lazy"
                            decoding="async"
                            className={`h-full w-full ${imageFitClass(item.imageFit)}`}
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[15px] font-medium ${
                            qty > 0 ? "text-[var(--cat-accent)]" : "text-[var(--cat-ink)]"
                          }`}
                        >
                          {item.name}
                          {qty > 0 && <span className="ml-1 text-[13px]">× {qty}</span>}
                        </span>
                        {item.description ? (
                          <span className="mt-0.5 block truncate text-[12px] text-[#8a8171]">
                            {item.description}
                          </span>
                        ) : null}
                        {!available ? (
                          <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#8a8171]">
                            Unavailable
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[15px] font-semibold text-[var(--cat-ink)]">
                        {formatMoney(item.price, catalog.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <p className="mt-10 text-center text-[13px] text-[#8a8171]">
          Tap any line to add or remove it from your order.
        </p>
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
