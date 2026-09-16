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

/** First item as a hero, remaining items in a simple grid. */
export function SpotlightTemplate({
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
  const { quantities, increment } = useCart();
  const [hero, ...rest] = catalog.items;

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--cat-border)] bg-white/95 px-5 py-3 backdrop-blur">
        <BrandHeader catalog={catalog} />
        <CartButton onClick={onOpenCart} />
      </div>

      <CatalogSlots filters={filters} featured={featured} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {catalog.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : hero ? (
          <>
            <HeroCard
              item={hero}
              currency={catalog.currency}
              qty={quantities[hero.code] ?? 0}
              onSelect={setSelected}
              onAdd={() => (hasItemOptions(hero) ? setSelected(hero) : increment(hero.code))}
            />
            {rest.length > 0 ? (
              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                  More items
                </p>
                <div className="grid grid-cols-2 gap-3 @md:grid-cols-3 @5xl:grid-cols-4">
                  {rest.map((item, index) => (
                    <SpotCard
                      key={item.code}
                      item={item}
                      currency={catalog.currency}
                      qty={quantities[item.code] ?? 0}
                      eager={index < 4}
                      onSelect={setSelected}
                      onAdd={() => (hasItemOptions(item) ? setSelected(item) : increment(item.code))}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
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

function itemDescription(item: StorefrontItem): string {
  if (!item.description) return "";
  if (item.isCombo && isAutoComboDescription(item.description, item.comboIncludes)) return "";
  return item.description;
}

function HeroCard({
  item,
  currency,
  qty,
  onSelect,
  onAdd,
}: {
  item: StorefrontItem;
  currency: string;
  qty: number;
  onSelect: (item: StorefrontItem) => void;
  onAdd: () => void;
}) {
  const { acceptOrders, pausedMessage } = useCart();
  const available = isItemAvailable(item);
  const cue = item.isCombo ? null : optionsCue(item);
  const names = item.isCombo ? [] : variantValueNames(item);
  const showChips = names.length > 0 && names.length <= 8;
  const description = itemDescription(item);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--cat-border)] bg-[var(--cat-surface)] shadow-sm @md:grid @md:grid-cols-2">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`relative aspect-[4/3] w-full bg-[var(--cat-photo-bg)] @md:aspect-auto @md:h-full ${
          item.isCombo ? "@md:min-h-[400px]" : "@md:min-h-[320px]"
        }`}
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            width={900}
            height={700}
            loading="eager"
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
      </button>
      <div className="flex flex-col justify-center px-5 py-6 sm:px-8">
        {item.category ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
            {item.category}
          </p>
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
            Featured
          </p>
        )}
        <h1 className="mt-2 text-[clamp(26px,4vw,38px)] font-semibold leading-[1.08] tracking-tight text-[var(--cat-ink)]">
          {item.name}
        </h1>
        {item.isCombo ? (
          <ComboIncludes lines={item.comboIncludes} layout="list" size="lg" className="mt-3" />
        ) : null}
        {showChips ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {names.map((name) => (
              <span
                key={name}
                className="rounded-full border border-[var(--cat-border)] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--cat-ink)]"
              >
                {name}
              </span>
            ))}
          </div>
        ) : cue ? (
          <p className="mt-3 text-[12px] font-semibold text-[var(--cat-accent)]">{cue}</p>
        ) : null}
        {description ? (
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--cat-muted)]">{description}</p>
        ) : null}
        {item.code ? <p className="mt-2 text-xs text-[var(--cat-muted)]">{item.code}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="text-[22px] font-semibold text-[var(--cat-ink)]">
            {formatMoney(item.price, currency)}
          </span>
          {acceptOrders && available ? (
            <button
              type="button"
              onClick={onAdd}
              className="min-h-11 rounded-full bg-[var(--cat-accent)] px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              {qty > 0 ? `Added × ${qty}` : hasItemOptions(item) ? "Choose options" : "Add to order"}
            </button>
          ) : available ? null : (
            <span className="text-[13px] font-medium text-[var(--cat-muted)]">Unavailable</span>
          )}
        </div>
        {!acceptOrders ? (
          <div className="mt-4">
            <PausedNote message={pausedMessage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpotCard({
  item,
  currency,
  qty,
  eager,
  onSelect,
  onAdd,
}: {
  item: StorefrontItem;
  currency: string;
  qty: number;
  eager?: boolean;
  onSelect: (item: StorefrontItem) => void;
  onAdd: () => void;
}) {
  const { acceptOrders, pausedMessage } = useCart();
  const available = isItemAvailable(item);
  const cue = item.isCombo ? null : optionsCue(item);
  const names = item.isCombo ? [] : variantValueNames(item);
  const showChips = names.length > 0 && names.length <= 4;

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-[var(--cat-surface)]">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="relative aspect-[584/480] w-full bg-[var(--cat-photo-bg)]"
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            width={584}
            height={480}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full ${imageFitClass(item.imageFit)}`}
          />
        ) : null}
        {item.isCombo ? (
          <span className="absolute left-2 top-2">
            <ComboBadge />
          </span>
        ) : cue ? (
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cat-accent)] shadow-sm">
            {cue}
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={() => onSelect(item)} className="text-left">
          <p className="text-[14px] font-semibold leading-tight text-[var(--cat-ink)]">{item.name}</p>
          {item.code ? <p className="text-xs text-[var(--cat-muted)]">{item.code}</p> : null}
        </button>
        {item.isCombo ? <ComboIncludes lines={item.comboIncludes} /> : null}
        {showChips ? (
          <div className="flex flex-wrap gap-1">
            {names.map((name) => (
              <span
                key={name}
                className="rounded-full bg-[#f4f5f7] px-2 py-0.5 text-[10px] font-medium text-[var(--cat-ink)]"
              >
                {name}
              </span>
            ))}
          </div>
        ) : cue ? (
          <p className="text-[11px] font-semibold text-[var(--cat-accent)]">{cue}</p>
        ) : null}
        <p className="mt-auto text-sm font-bold text-[var(--cat-ink)]">{formatMoney(item.price, currency)}</p>
        {!acceptOrders ? (
          <PausedNote message={pausedMessage} />
        ) : available ? (
          <button
            type="button"
            onClick={onAdd}
            className="min-h-11 w-full rounded-[9px] border border-[var(--cat-accent)] py-1.5 text-xs font-semibold text-[var(--cat-accent)] hover:bg-slate-50"
          >
            {qty > 0 ? `Added × ${qty}` : hasItemOptions(item) ? "Options" : "Add"}
          </button>
        ) : (
          <p className="text-center text-xs font-medium text-[var(--cat-muted)]">Unavailable</p>
        )}
      </div>
    </div>
  );
}
