"use client";

import { useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { formatMoney } from "@/lib/catalog/currency";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";
import { hasItemOptions } from "@/lib/catalog/item-options";
import { useCart } from "@/lib/catalog/cart-context";
import { ProductDetailModal } from "./ProductDetailModal";

export function FeaturedStrip({ catalog }: { catalog: StorefrontCatalog }) {
  const featured = catalog.items.filter((item) => item.featured);
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const { quantities, increment } = useCart();

  if (featured.length === 0) return null;
  const only = featured.length === 1 ? featured[0] : undefined;

  return (
    <section className="border-b border-[var(--cat-border)] bg-[#fbfbfd] print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
          Featured
        </p>
        {only ? (
          <FeaturedBanner
            item={only}
            currency={catalog.currency}
            qty={quantities[only.code] ?? 0}
            onSelect={setSelected}
            onAdd={() => (hasItemOptions(only) ? setSelected(only) : increment(only.code))}
          />
        ) : (
          <div className="-mx-1 mt-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
            {featured.map((item) => (
              <FeaturedCard
                key={item.id}
                item={item}
                currency={catalog.currency}
                qty={quantities[item.code] ?? 0}
                onSelect={setSelected}
                onAdd={() => (hasItemOptions(item) ? setSelected(item) : increment(item.code))}
              />
            ))}
          </div>
        )}
      </div>
      {selected ? (
        <ProductDetailModal
          item={selected}
          currency={catalog.currency}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

function FeaturedBanner({
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
  const available = isItemAvailable(item);
  const { acceptOrders, pausedMessage } = useCart();
  return (
    <article className="mt-2 flex items-center gap-3 rounded-[14px] border border-[var(--cat-border)] bg-white p-2 sm:gap-4 sm:p-2.5">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-[10px] bg-[var(--cat-photo-bg)] sm:h-24 sm:w-24"
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full ${imageFitClass(item.imageFit)}`}
          />
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="block w-full cursor-pointer text-left"
        >
          <p className="truncate text-[14px] font-semibold text-[var(--cat-ink)]" title={item.name}>
            {item.name}
          </p>
          <p className="mt-0.5 text-[14px] font-bold text-[var(--cat-ink)]">
            {formatMoney(item.price, currency)}
          </p>
        </button>
      </div>
      {available ? (
        acceptOrders ? (
          <button
            type="button"
            onClick={onAdd}
            className="min-h-11 shrink-0 cursor-pointer rounded-[9px] bg-[var(--cat-accent)] px-3.5 text-[13px] font-semibold text-white sm:px-4"
          >
            {qty > 0 ? `Added × ${qty}` : hasItemOptions(item) ? "Options" : "Add"}
          </button>
        ) : (
          <p className="max-w-[10rem] text-right text-[12px] text-[var(--cat-muted)]">{pausedMessage}</p>
        )
      ) : (
        <p className="shrink-0 text-[12px] font-medium text-[var(--cat-muted)]">Unavailable</p>
      )}
    </article>
  );
}

function FeaturedCard({
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
  const available = isItemAvailable(item);
  const { acceptOrders, pausedMessage } = useCart();
  return (
    <article className="flex w-[148px] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-white sm:w-[168px]">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="relative aspect-square w-full cursor-pointer bg-[var(--cat-photo-bg)]"
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            width={168}
            height={168}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full ${imageFitClass(item.imageFit)}`}
          />
        ) : null}
        {!available ? (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/65 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
            Unavailable
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="truncate text-[13px] font-semibold text-[var(--cat-ink)]" title={item.name}>
          {item.name}
        </p>
        <p className="mt-1 text-[13px] font-bold text-[var(--cat-ink)]">
          {formatMoney(item.price, currency)}
        </p>
        {available ? (
          acceptOrders ? (
            <button
              type="button"
              onClick={onAdd}
              className="mt-auto min-h-9 w-full cursor-pointer rounded-[8px] bg-[var(--cat-accent)] text-[12px] font-semibold text-white"
            >
              {qty > 0 ? `Added × ${qty}` : hasItemOptions(item) ? "Options" : "Add"}
            </button>
          ) : (
            <p className="mt-auto text-[11px] leading-snug text-[var(--cat-muted)]">{pausedMessage}</p>
          )
        ) : (
          <p className="mt-auto text-[11px] font-medium text-[var(--cat-muted)]">Unavailable</p>
        )}
      </div>
    </article>
  );
}
