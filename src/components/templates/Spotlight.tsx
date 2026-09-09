"use client";

import { useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { formatMoney } from "@/lib/catalog/currency";
import { BrandHeader } from "./BrandHeader";

/** First item as a hero, remaining items in a simple grid. */
export function SpotlightTemplate({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
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
              onAdd={() => increment(hero.code)}
            />
            {rest.length > 0 ? (
              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                  More items
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {rest.map((item, index) => (
                    <SpotCard
                      key={item.code}
                      item={item}
                      currency={catalog.currency}
                      qty={quantities[item.code] ?? 0}
                      eager={index < 4}
                      onSelect={setSelected}
                      onAdd={() => increment(item.code)}
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
  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--cat-border)] bg-[var(--cat-surface)] shadow-sm sm:grid sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="relative aspect-[4/3] w-full bg-[var(--cat-photo-bg)] sm:aspect-auto sm:min-h-[320px]"
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
            className="absolute inset-0 h-full w-full object-contain"
          />
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
        {item.description ? (
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--cat-muted)]">
            {item.description}
          </p>
        ) : null}
        {item.code ? <p className="mt-2 text-xs text-[var(--cat-muted)]">{item.code}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="text-[22px] font-semibold text-[var(--cat-ink)]">
            {formatMoney(item.price, currency)}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full bg-[var(--cat-accent)] px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
          >
            {qty > 0 ? `Added × ${qty}` : "Add to order"}
          </button>
        </div>
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
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={() => onSelect(item)} className="text-left">
          <p className="text-[14px] font-semibold leading-tight text-[var(--cat-ink)]">{item.name}</p>
          {item.code ? <p className="text-xs text-[var(--cat-muted)]">{item.code}</p> : null}
        </button>
        <p className="mt-auto text-sm font-bold text-[var(--cat-ink)]">
          {formatMoney(item.price, currency)}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-[9px] border border-[var(--cat-accent)] py-1.5 text-xs font-semibold text-[var(--cat-accent)] hover:bg-slate-50"
        >
          {qty > 0 ? `Added × ${qty}` : "Add"}
        </button>
      </div>
    </div>
  );
}
