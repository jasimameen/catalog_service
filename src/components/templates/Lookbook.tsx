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

/** Large imagery, generous spacing, for a short, considered list. */
export function LookbookTemplate({
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
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--cat-border)] bg-white/95 px-6 py-3 backdrop-blur">
        <BrandHeader catalog={catalog} />
        <CartButton onClick={onOpenCart} />
      </div>

      <CatalogSlots filters={filters} featured={featured} />

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
          <div className="mt-12 grid grid-cols-1 gap-10 @md:grid-cols-2">
            {catalog.items.map((item, index) => (
              <LookbookEntry
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

function LookbookEntry({
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
    <div>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`relative block w-full overflow-hidden rounded-[14px] bg-[var(--cat-photo-bg)] ${
          item.isCombo ? "aspect-[4/5] @md:aspect-[3/4]" : "aspect-[4/3]"
        }`}
      >
        {item.image ? (
          // User-pasted https/data URLs are not in next/image remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            width={800}
            height={item.isCombo ? 1000 : 600}
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
      </button>

      {item.isCombo ? (
        <ComboIncludes lines={item.comboIncludes} layout="list" size="lg" className="mt-3" />
      ) : null}

      <h3 className="mt-5 text-xl font-semibold tracking-tight text-[var(--cat-ink)]">{item.name}</h3>

      {showChips ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {names.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[12px] font-medium text-[var(--cat-ink)]"
            >
              {name}
            </span>
          ))}
        </div>
      ) : cue ? (
        <p className="mt-2 text-[12px] font-semibold text-[var(--cat-accent)]">{cue}</p>
      ) : null}

      {description ? (
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--cat-muted)]">{description}</p>
      ) : null}

      <div className="mt-4">
        <span className="text-[17px] font-semibold text-[var(--cat-ink)]">
          {formatMoney(item.price, currency)}
        </span>
        <div className="mt-3">
          {!acceptOrders ? (
            <PausedNote message={pausedMessage} />
          ) : !available ? (
            <span className="text-[13px] font-medium text-[var(--cat-muted)]">Unavailable</span>
          ) : (
            <button
              type="button"
              onClick={() => (hasItemOptions(item) ? onSelect(item) : increment(item.code))}
              className="min-h-11 rounded-full border border-[var(--cat-ink)] px-4 py-2 text-[13px] font-medium text-[var(--cat-ink)] hover:bg-slate-50"
            >
              {qty > 0 ? `Added × ${qty}` : hasItemOptions(item) ? "Choose options" : "Add to order"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
