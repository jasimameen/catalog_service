"use client";

import { useState, type ReactNode } from "react";
import { CatalogSlots } from "./CatalogSlots";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ComboBadge } from "@/components/storefront/ComboBadge";
import { ComboIncludes } from "@/components/storefront/ComboIncludes";
import { PausedNote } from "@/components/storefront/PausedNote";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { isAutoComboDescription } from "@/lib/catalog/combos";
import { formatMoney } from "@/lib/catalog/currency";
import { hasItemOptions, optionsCue, variantValueNames } from "@/lib/catalog/item-options";
import { BrandHeader } from "./BrandHeader";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";

/** Large editorial image cards — one or two across. */
export function CardsTemplate({
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

  return (
    <div className="bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--cat-border)] bg-white/95 px-5 py-3 backdrop-blur">
        <BrandHeader catalog={catalog} />
        <CartButton onClick={onOpenCart} />
      </div>

      <CatalogSlots filters={filters} featured={featured} />

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {catalog.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 @md:grid-cols-2">
            {catalog.items.map((item, index) => (
              <EditorialCard
                key={item.code}
                item={item}
                currency={catalog.currency}
                eager={index < 2}
                onSelect={setSelected}
              />
            ))}
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

function EditorialCard({
  item,
  currency,
  eager,
  onSelect,
}: {
  item: StorefrontItem;
  currency: string;
  eager: boolean;
  onSelect: (item: StorefrontItem) => void;
}) {
  const { quantities, increment, acceptOrders, pausedMessage } = useCart();
  const qty = quantities[item.code] ?? 0;
  const available = isItemAvailable(item);
  const cue = item.isCombo ? null : optionsCue(item);
  const names = item.isCombo ? [] : variantValueNames(item);
  const showChips = names.length > 0 && names.length <= 8;
  const description =
    item.description && !(item.isCombo && isAutoComboDescription(item.description, item.comboIncludes))
      ? item.description
      : "";

  return (
    <article
      className={`overflow-hidden rounded-[18px] border border-[var(--cat-border)] bg-[var(--cat-surface)] shadow-sm ${
        available ? "" : "opacity-70"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`relative block w-full bg-[var(--cat-photo-bg)] ${
          item.isCombo ? "aspect-[5/4]" : "aspect-[4/3]"
        }`}
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            width={960}
            height={item.isCombo ? 768 : 720}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full ${imageFitClass(item.imageFit)}`}
          />
        ) : null}
        {item.isCombo ? (
          <span className="absolute left-3 top-3">
            <ComboBadge />
          </span>
        ) : cue ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cat-accent)] shadow-sm">
            {cue}
          </span>
        ) : null}
        {!available ? (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-black/65 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
            Unavailable
          </span>
        ) : null}
      </button>
      <div className="px-5 pb-5 pt-4">
        {item.code ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
            {item.code}
          </p>
        ) : null}
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--cat-ink)]">{item.name}</h2>
        {item.isCombo ? <ComboIncludes lines={item.comboIncludes} className="mt-2" /> : null}
        {showChips ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {names.map((name) => (
              <span
                key={name}
                className="rounded-full border border-[var(--cat-border)] bg-white px-2.5 py-0.5 text-[12px] font-medium text-[var(--cat-ink)]"
              >
                {name}
              </span>
            ))}
          </div>
        ) : cue ? (
          <p className="mt-2 text-[12px] font-semibold text-[var(--cat-accent)]">{cue}</p>
        ) : null}
        {description ? (
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--cat-muted)]">{description}</p>
        ) : null}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[18px] font-semibold text-[var(--cat-ink)]">
              {formatMoney(item.price, currency)}
            </span>
            {acceptOrders && available ? (
              <button
                type="button"
                onClick={() => (hasItemOptions(item) ? onSelect(item) : increment(item.code))}
                className="min-h-11 rounded-full bg-[var(--cat-accent)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                {qty > 0 ? `Added × ${qty}` : hasItemOptions(item) ? "Choose options" : "Add to order"}
              </button>
            ) : available ? null : (
              <span className="text-[13px] font-medium text-[var(--cat-muted)]">Unavailable</span>
            )}
          </div>
          {!acceptOrders ? (
            <div className="mt-3">
              <PausedNote message={pausedMessage} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
