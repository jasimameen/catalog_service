"use client";

import { useMemo } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { formatMoney } from "@/lib/catalog/currency";
import { BrandHeader } from "./BrandHeader";

/** Sectioned list, no photos required — kitchens, services, weekly supply lists. */
export function MenuTemplate({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}) {
  const { quantities, increment, decrement } = useCart();

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
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => (qty > 0 ? decrement(item.code) : increment(item.code))}
                      className="flex w-full items-baseline gap-2 border-b border-dotted border-[#ddd5c5] py-2.5 text-left"
                    >
                      <span
                        className={`text-[15px] font-medium ${qty > 0 ? "text-[var(--cat-accent)]" : "text-[var(--cat-ink)]"}`}
                      >
                        {item.name}
                        {qty > 0 && <span className="ml-1 text-[13px]">× {qty}</span>}
                      </span>
                      <span className="flex-1" />
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
    </div>
  );
}
