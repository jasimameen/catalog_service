"use client";

import { useMemo, useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";

const QUICK_MULTIPLES = [6, 12, 24];

/**
 * "Trade Grid" template — dense photo grid, item codes, quick-multiple
 * quantity steppers. This is the layout the original single-tenant Kleaner
 * catalogue used; every other tenant can pick it too.
 *
 * Sections group items by their raw `category` string in first-appearance
 * order (no fixed taxonomy) — items with no category collapse into one
 * "All items" section, which is what a catalog built through the wizard
 * looks like (the builder doesn't collect a category, only name/price/photo).
 */
export function GridTemplate({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StorefrontItem | null>(null);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = catalog.items.filter((item) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });

    const order: string[] = [];
    const grouped = new Map<string, StorefrontItem[]>();
    for (const item of matches) {
      const group = item.category.trim() || "All items";
      if (!grouped.has(group)) {
        grouped.set(group, []);
        order.push(group);
      }
      grouped.get(group)!.push(item);
    }
    return order.map((group) => ({ group, items: grouped.get(group)! }));
  }, [catalog.items, query]);

  const totalMatches = sections.reduce((sum, s) => sum + s.items.length, 0);
  const showGroupHeaders = sections.length > 1 || sections[0]?.group !== "All items";

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-[var(--cat-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-catalog-display text-xl font-bold text-[var(--cat-accent)]">
              {catalog.name}
            </span>
          </div>
          <CartButton onClick={onOpenCart} />
        </div>
        <div className="mx-auto max-w-6xl space-y-3 px-4 pb-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cat-muted)]">
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or item code"
              className="w-full rounded-[9px] border border-[var(--cat-border)] bg-white py-2 pl-9 pr-3 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {catalog.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : totalMatches === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">
            No products match your search.
          </p>
        ) : (
          <div className="space-y-8 pb-28">
            {sections.map(({ group, items }) => (
              <section key={group}>
                {showGroupHeaders && (
                  <div className="mb-3 flex items-baseline gap-2 border-b border-[var(--cat-border)] pb-2">
                    <h2 className="font-catalog-display text-lg font-bold text-[var(--cat-ink)]">
                      {group}
                    </h2>
                    <span className="text-sm text-[var(--cat-muted)]">{items.length} items</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((item) => (
                    <GridCard
                      key={item.code}
                      item={item}
                      currency={catalog.currency}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              </section>
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

function GridCard({
  item,
  currency,
  onSelect,
}: {
  item: StorefrontItem;
  currency: string;
  onSelect: (item: StorefrontItem) => void;
}) {
  const { quantities, increment, decrement, setQuantity } = useCart();
  const qty = quantities[item.code] ?? 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-[var(--cat-surface)] shadow-sm">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="relative aspect-[584/480] w-full bg-[var(--cat-photo-bg)]"
        aria-label={`View details for ${item.name}`}
      >
        {item.image ? (
          // User-pasted https/data URLs are not in next/image remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-contain" />
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={() => onSelect(item)} className="text-left">
          <p className="text-[15px] font-semibold leading-tight text-[var(--cat-ink)]">
            {item.name}
          </p>
          {item.code && <p className="text-xs text-[var(--cat-muted)]">{item.code}</p>}
        </button>
        {item.description && (
          <p className="kl-line-clamp-2 text-xs text-[var(--cat-muted)]">{item.description}</p>
        )}

        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--cat-muted)]">
              {currency}
            </p>
            <p className="text-lg font-bold text-[var(--cat-ink)]">{item.price.toFixed(2)}</p>
          </div>
          {qty > 0 && (
            <p className="text-xs text-[var(--cat-muted)]">
              × {qty} = {(item.price * qty).toFixed(2)}
            </p>
          )}
        </div>

        {qty === 0 ? (
          <button
            type="button"
            onClick={() => increment(item.code)}
            className="w-full rounded-[9px] border border-[var(--cat-accent)] bg-white py-2 text-sm font-semibold text-[var(--cat-accent)] transition hover:bg-slate-50 active:scale-[0.98]"
          >
            Add to order
          </button>
        ) : (
          <>
            <div className="flex items-stretch overflow-hidden rounded-[9px] border border-[var(--cat-border)]">
              <button
                type="button"
                onClick={() => decrement(item.code)}
                aria-label={`Remove one ${item.name}`}
                className="flex-1 border-r border-[var(--cat-border)] py-2 text-base font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
              >
                −
              </button>
              <span className="flex-1 py-2 text-center text-sm font-semibold text-[var(--cat-ink)]">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => increment(item.code)}
                aria-label={`Add one more ${item.name}`}
                className="flex-1 border-l border-[var(--cat-border)] py-2 text-base font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
              >
                +
              </button>
            </div>
            <div className="flex gap-1.5">
              {QUICK_MULTIPLES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuantity(item.code, n)}
                  className="flex-1 rounded-full bg-slate-100 py-1 text-xs font-medium text-[var(--cat-muted)] hover:bg-slate-200"
                >
                  ×{n}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
