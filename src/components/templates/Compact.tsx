"use client";

import { useMemo, useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { BrandHeader } from "./BrandHeader";

/** Dense rows for long trade lists — code, name, price, stepper. */
export function CompactTemplate({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const { quantities, increment, decrement } = useCart();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.items;
    return catalog.items.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [catalog.items, query]);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-[var(--cat-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <BrandHeader
            catalog={catalog}
            nameClassName="font-catalog-display text-lg font-bold leading-tight text-[var(--cat-ink)]"
          />
          <CartButton onClick={onOpenCart} />
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or code"
            className="w-full rounded-[9px] border border-[var(--cat-border)] bg-white px-3 py-1.5 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-3 pb-28">
        {catalog.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : matches.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">
            No products match your search.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-[var(--cat-border)] bg-[var(--cat-surface)]">
            {matches.map((item) => (
              <CompactRow
                key={item.code}
                item={item}
                currency={catalog.currency}
                qty={quantities[item.code] ?? 0}
                onSelect={setSelected}
                onIncrement={() => increment(item.code)}
                onDecrement={() => decrement(item.code)}
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

function CompactRow({
  item,
  currency,
  qty,
  onSelect,
  onIncrement,
  onDecrement,
}: {
  item: StorefrontItem;
  currency: string;
  qty: number;
  onSelect: (item: StorefrontItem) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--cat-border)] px-2.5 py-2 last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-[var(--cat-photo-bg)]"
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        ) : null}
      </button>
      <button type="button" onClick={() => onSelect(item)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-semibold leading-tight text-[var(--cat-ink)]">
          {item.name}
        </p>
        <p className="truncate text-[11px] text-[var(--cat-muted)]">
          {item.code}
          {item.pack ? ` · ${item.pack}` : ""}
        </p>
      </button>
      <div className="shrink-0 text-right">
        <p className="text-[10px] uppercase tracking-wide text-[var(--cat-muted)]">{currency}</p>
        <p className="text-sm font-bold text-[var(--cat-ink)]">{item.price.toFixed(2)}</p>
      </div>
      {qty === 0 ? (
        <button
          type="button"
          onClick={onIncrement}
          className="shrink-0 rounded-[8px] border border-[var(--cat-accent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--cat-accent)]"
        >
          Add
        </button>
      ) : (
        <div className="flex shrink-0 items-stretch overflow-hidden rounded-[8px] border border-[var(--cat-border)]">
          <button
            type="button"
            onClick={onDecrement}
            aria-label={`Remove one ${item.name}`}
            className="px-2 py-1 text-sm font-semibold text-[var(--cat-ink)]"
          >
            −
          </button>
          <span className="min-w-7 py-1 text-center text-xs font-semibold text-[var(--cat-ink)]">
            {qty}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            aria-label={`Add one more ${item.name}`}
            className="px-2 py-1 text-sm font-semibold text-[var(--cat-ink)]"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
