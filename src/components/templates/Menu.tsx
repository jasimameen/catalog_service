"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CatalogSlots } from "./CatalogSlots";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { ComboBadge } from "@/components/storefront/ComboBadge";
import { ComboIncludes } from "@/components/storefront/ComboIncludes";
import { PausedNote } from "@/components/storefront/PausedNote";
import { formatMoney } from "@/lib/catalog/currency";
import { hasItemOptions, optionsCue } from "@/lib/catalog/item-options";
import { BrandHeader } from "./BrandHeader";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";
import { isRestaurantCatalog } from "@/lib/catalog/template-settings";
import { RestaurantMenu } from "@/components/storefront/RestaurantMenu";

/** Sectioned food menu — photos use cover by default. Combos get their own section. */
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
  const { quantities, increment, decrement, acceptOrders, pausedMessage } = useCart();
  if (isRestaurantCatalog(catalog.template, catalog.fulfillmentModes)) {
    return <RestaurantMenu catalog={catalog} onOpenCart={onOpenCart} />;
  }

  const { comboItems, otherSections } = useMemo(() => {
    const combos = catalog.items.filter((item) => item.isCombo);
    const order: string[] = [];
    const grouped = new Map<string, StorefrontItem[]>();
    for (const item of catalog.items) {
      if (item.isCombo) continue;
      const group = item.category.trim() || "Menu";
      if (!grouped.has(group)) {
        grouped.set(group, []);
        order.push(group);
      }
      grouped.get(group)!.push(item);
    }
    return {
      comboItems: combos,
      otherSections: order
        .filter((group) => group !== "Combos" && (grouped.get(group)?.length ?? 0) > 0)
        .map((group) => ({ group, items: grouped.get(group)! })),
    };
  }, [catalog.items]);

  return (
    <div className="bg-[var(--cat-bg)]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--cat-border)] bg-white/95 px-6 py-3 backdrop-blur">
        <BrandHeader
          catalog={catalog}
          nameClassName="font-catalog-display text-lg font-bold leading-tight text-[var(--cat-ink)]"
        />
        <CartButton onClick={onOpenCart} />
      </div>

      <CatalogSlots filters={filters} featured={featured} />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <div className="border-b border-[var(--cat-border)] pb-6 text-center">
          <h1 className="text-[26px] font-semibold uppercase tracking-[0.02em] text-[var(--cat-ink)]">
            {catalog.name}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--cat-muted)]">
            Prices in {catalog.currency} · Tap any line to add it to your order
          </p>
        </div>

        {!acceptOrders ? (
          <div className="mt-6">
            <PausedNote message={pausedMessage} />
          </div>
        ) : null}

        {catalog.items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : (
          <div className="mt-8 space-y-10">
            {comboItems.length > 0 ? (
              <MenuSection
                group="Combos"
                items={comboItems}
                currency={catalog.currency}
                quantities={quantities}
                acceptOrders={acceptOrders}
                onSelect={setSelected}
                onToggle={(item) => {
                  const qty = quantities[item.code] ?? 0;
                  if (qty > 0) decrement(item.code);
                  else increment(item.code);
                }}
              />
            ) : null}
            {otherSections.length > 0 ? (
              <div className="grid grid-cols-1 gap-10 @md:grid-cols-2">
                {otherSections.map(({ group, items }) => (
                  <MenuSection
                    key={group}
                    group={group}
                    items={items}
                    currency={catalog.currency}
                    quantities={quantities}
                    acceptOrders={acceptOrders}
                    onSelect={setSelected}
                    onToggle={(item) => {
                      const qty = quantities[item.code] ?? 0;
                      if (qty > 0) decrement(item.code);
                      else increment(item.code);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
        <p className="mt-10 text-center text-[13px] text-[var(--cat-muted)]">
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

function MenuSection({
  group,
  items,
  currency,
  quantities,
  acceptOrders,
  onSelect,
  onToggle,
}: {
  group: string;
  items: StorefrontItem[];
  currency: string;
  quantities: Record<string, number>;
  acceptOrders: boolean;
  onSelect: (item: StorefrontItem) => void;
  onToggle: (item: StorefrontItem) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
        {group}
      </p>
      {items.map((item) => {
        const qty = quantities[item.code] ?? 0;
        const available = isItemAvailable(item);
        const cue = item.isCombo ? null : optionsCue(item);
        function activate() {
          if (!available) return;
          if (!acceptOrders || hasItemOptions(item)) {
            onSelect(item);
            return;
          }
          onToggle(item);
        }
        return (
          <div
            key={item.code}
            role="button"
            tabIndex={0}
            onClick={activate}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }}
            className={`flex min-h-14 w-full cursor-pointer items-start gap-3 border-b border-dotted border-[var(--cat-border)] py-2.5 text-left ${
              available ? "" : "opacity-55"
            }`}
          >
            <span className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--cat-photo-bg)]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full ${imageFitClass(item.imageFit)}`}
                />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`truncate text-[15px] font-medium ${
                    qty > 0 ? "text-[var(--cat-accent)]" : "text-[var(--cat-ink)]"
                  }`}
                >
                  {item.name}
                  {qty > 0 && <span className="ml-1 text-[13px]">× {qty}</span>}
                </span>
                {item.isCombo ? <ComboBadge /> : null}
              </span>
              {item.isCombo ? (
                <ComboIncludes lines={item.comboIncludes} layout="list" size="sm" className="mt-1" />
              ) : cue ? (
                <span className="mt-0.5 block text-[12px] font-medium text-[var(--cat-accent)]">
                  {cue}
                </span>
              ) : item.description ? (
                <span className="mt-0.5 block truncate text-[12px] text-[var(--cat-muted)]">
                  {item.description}
                </span>
              ) : null}
              {!item.isCombo && item.description && cue ? (
                <span className="mt-0.5 block truncate text-[12px] text-[var(--cat-muted)]">
                  {item.description}
                </span>
              ) : null}
              {!available ? (
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-[var(--cat-muted)]">
                  Unavailable
                </span>
              ) : null}
            </span>
            <span className="shrink-0 pt-0.5 text-[15px] font-semibold text-[var(--cat-ink)]">
              {formatMoney(item.price, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
