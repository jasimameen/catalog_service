"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { CartButton } from "@/components/storefront/CartButton";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { comboCoverImage, isAutoComboDescription } from "@/lib/catalog/combos";
import { hasItemOptions, optionsCue } from "@/lib/catalog/item-options";
import { ComboBadge } from "@/components/storefront/ComboBadge";
import { ComboIncludesList } from "@/components/storefront/ComboIncludesList";
import { BrandHeader } from "./BrandHeader";
import { HeaderContact } from "@/components/storefront/HeaderContact";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";
import { PausedNote } from "@/components/storefront/PausedNote";

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
  filters,
  featured,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
  filters?: ReactNode;
  featured?: ReactNode;
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
        item.description.toLowerCase().includes(q) ||
        item.comboIncludes.some((line) => line.name.toLowerCase().includes(q))
      );
    });

    const order: string[] = [];
    const grouped = new Map<string, StorefrontItem[]>();
    for (const item of matches) {
      const raw = item.category.trim();
      const group = item.isCombo && (!raw || raw.toLowerCase() === "combos") ? "Combos" : raw || "All items";
      if (!grouped.has(group)) {
        grouped.set(group, []);
        order.push(group);
      }
      grouped.get(group)!.push(item);
    }
    const combosIdx = order.indexOf("Combos");
    if (combosIdx > 0) {
      order.splice(combosIdx, 1);
      order.unshift("Combos");
    }
    return order.map((group) => ({ group, items: grouped.get(group)! }));
  }, [catalog.items, query]);

  const totalMatches = sections.reduce((sum, s) => sum + s.items.length, 0);
  const showGroupHeaders = sections.length > 1 || sections[0]?.group !== "All items";
  const grid = catalog.settings.grid;
  const colClass =
    grid.columns === 2
      ? "grid grid-cols-2 gap-3"
      : grid.columns === 3
        ? "grid grid-cols-2 gap-3 @md:grid-cols-3"
        : "grid grid-cols-2 gap-3 @md:grid-cols-3 @5xl:grid-cols-4";

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-[var(--cat-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <BrandHeader catalog={catalog} />
          <div className="flex shrink-0 items-center gap-3">
            <HeaderContact catalog={catalog} />
            <CartButton onClick={onOpenCart} />
          </div>
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
          {filters}
        </div>
      </div>

      {featured}

      <div className="mx-auto max-w-6xl px-4 py-5">
        {catalog.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">No items yet.</p>
        ) : totalMatches === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cat-muted)]">
            No products match your search.
          </p>
        ) : (
          <div className="space-y-8 pb-28">
            {sections.map(({ group, items }, sectionIndex) => {
              const priorCount = sections
                .slice(0, sectionIndex)
                .reduce((sum, section) => sum + section.items.length, 0);
              return (
                <section key={group}>
                  {showGroupHeaders && (
                    <div className="mb-3 flex items-baseline gap-2 border-b border-[var(--cat-border)] pb-2">
                      <h2 className="font-catalog-display text-lg font-bold text-[var(--cat-ink)]">
                        {group}
                      </h2>
                      <span className="text-sm text-[var(--cat-muted)]">{items.length} items</span>
                    </div>
                  )}
                  <div
                    className={
                      group === "Combos"
                        ? "grid grid-cols-1 gap-3 @md:grid-cols-2"
                        : colClass
                    }
                  >
                    {items.map((item, itemIndex) => (
                      <GridCard
                        key={item.code}
                        item={item}
                        currency={catalog.currency}
                        eager={priorCount + itemIndex < 8}
                        onSelect={setSelected}
                        mixedSection={group !== "Combos"}
                        showCodes={grid.showCodes}
                        qtySteppers={grid.qtySteppers}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
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
  eager,
  onSelect,
  mixedSection,
  showCodes = true,
  qtySteppers = true,
}: {
  item: StorefrontItem;
  currency: string;
  eager?: boolean;
  onSelect: (item: StorefrontItem) => void;
  mixedSection?: boolean;
  showCodes?: boolean;
  qtySteppers?: boolean;
}) {
  const { quantities, increment, decrement, setQuantity, acceptOrders, pausedMessage } = useCart();
  const qty = quantities[item.code] ?? 0;
  const cue = item.isCombo ? null : optionsCue(item);
  const cover = item.isCombo ? comboCoverImage(item) : item.image;
  const showDescription =
    Boolean(item.description) &&
    !(item.isCombo && isAutoComboDescription(item.description, item.comboIncludes));
  const bannerCombo = item.isCombo && mixedSection;

  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-[var(--cat-surface)] shadow-sm ${
        bannerCombo ? "col-span-2 @md:col-span-1 @5xl:col-span-2" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`relative w-full max-w-full overflow-hidden bg-[var(--cat-photo-bg)] ${
          item.isCombo ? "aspect-[16/10]" : "aspect-[584/480]"
        }`}
        aria-label={`View details for ${item.name}`}
      >
        {cover ? (
          // User-pasted https/data URLs are not in next/image remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item.name}
            width={item.isCombo ? 640 : 584}
            height={item.isCombo ? 400 : 480}
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
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={() => onSelect(item)} className="min-w-0 text-left">
          <p className="text-[15px] font-semibold leading-tight text-[var(--cat-ink)]">
            {item.name}
          </p>
          {showCodes && item.code ? <p className="text-xs text-[var(--cat-muted)]">{item.code}</p> : null}
          {!item.isCombo && cue ? (
            <p className="mt-0.5 text-[11px] font-semibold text-[var(--cat-accent)]">{cue}</p>
          ) : null}
        </button>
        {item.isCombo ? <ComboIncludesList lines={item.comboIncludes} /> : null}
        {showDescription && (
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

        {!acceptOrders ? (
          <PausedNote message={pausedMessage} />
        ) : !isItemAvailable(item) ? (
          <p className="min-h-11 rounded-[9px] bg-slate-100 py-2 text-center text-sm font-semibold text-[var(--cat-muted)]">
            Unavailable
          </p>
        ) : hasItemOptions(item) ? (
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="min-h-11 w-full rounded-[9px] border border-[var(--cat-accent)] bg-white py-2 text-sm font-semibold text-[var(--cat-accent)] transition hover:bg-slate-50 active:scale-[0.98]"
          >
            {qty > 0 ? `Added × ${qty} · Options` : "Choose options"}
          </button>
        ) : !qtySteppers ? (
          <button
            type="button"
            onClick={() => increment(item.code)}
            className="min-h-11 w-full rounded-[9px] border border-[var(--cat-accent)] bg-white py-2 text-sm font-semibold text-[var(--cat-accent)]"
          >
            {qty > 0 ? `Added × ${qty}` : "Add to order"}
          </button>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={() => increment(item.code)}
            className="min-h-11 w-full rounded-[9px] border border-[var(--cat-accent)] bg-white py-2 text-sm font-semibold text-[var(--cat-accent)] transition hover:bg-slate-50 active:scale-[0.98]"
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
                className="min-h-11 flex-1 border-r border-[var(--cat-border)] py-2 text-base font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
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
                className="min-h-11 flex-1 border-l border-[var(--cat-border)] py-2 text-base font-semibold text-[var(--cat-ink)] hover:bg-slate-50"
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
