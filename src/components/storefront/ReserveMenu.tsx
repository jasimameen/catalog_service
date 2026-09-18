"use client";

import { useMemo, useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { formatMoney } from "@/lib/catalog/currency";
import { needsOptionPick, optionsCue } from "@/lib/catalog/item-options";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";
import { ProductDetailModal } from "./ProductDetailModal";

const LINE = "var(--cat-border)";
const MUTED = "var(--cat-muted)";

export function ReserveMenu({ catalog }: { catalog: StorefrontCatalog }) {
  const { quantities, increment, decrement, itemCount, subtotal, lines, acceptOrders } = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<StorefrontItem | null>(null);

  const cats = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const item of catalog.items) {
      const name = item.category.trim() || "Menu";
      if (seen.has(name)) continue;
      seen.add(name);
      order.push(name);
    }
    return order;
  }, [catalog.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.items.filter((item) => {
      if (category && (item.category.trim() || "Menu") !== category) return false;
      if (!q) return true;
      const hay = `${item.name} ${item.code} ${item.category} ${item.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [catalog.items, category, query]);

  return (
    <section className="mt-4 rounded-[14px] border border-[var(--cat-border)] bg-white p-4">
      <div className="mb-3">
        <h2 className="font-catalog-display m-0 text-[22px] font-semibold">Add food now</h2>
        <p className="m-0 mt-1 text-[13px] text-[var(--cat-muted)]">
          Optional. We&apos;ll send this to the kitchen with your table.
        </p>
      </div>

      {catalog.items.length === 0 ? (
        <p className="m-0 text-[13px] text-[var(--cat-muted)]">The menu is still being prepared.</p>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu"
            className="h-11 w-full rounded-[11px] border border-[var(--cat-border)] bg-white px-3 text-[14px] text-[var(--cat-ink)] outline-none"
          />
          {cats.length > 1 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              <Chip label="All" on={!category} onClick={() => setCategory("")} />
              {cats.map((c) => (
                <Chip key={c} label={c} on={category === c} onClick={() => setCategory(c)} />
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-1.5">
            {filtered.map((item) => (
              <ReserveItemRow
                key={item.id}
                item={item}
                catalog={catalog}
                qty={quantities[item.code] ?? 0}
                acceptOrders={acceptOrders}
                onOpen={() => setSelected(item)}
                onInc={() => increment(item.code)}
                onDec={() => decrement(item.code)}
              />
            ))}
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[var(--cat-muted)]">Nothing matches that search.</p>
            ) : null}
          </div>

          {itemCount > 0 ? (
            <div className="mt-3 rounded-[10px] bg-[var(--cat-photo-bg)] px-3 py-2.5 text-[13px]">
              <div className="font-semibold">
                {itemCount} {itemCount === 1 ? "dish" : "dishes"} · {formatMoney(subtotal, catalog.currency)}
              </div>
              <div className="mt-1 text-[12px] text-[var(--cat-muted)]">
                {lines
                  .filter((line) => line.qty > 0)
                  .map((line) => {
                    const item = catalog.items.find((row) => row.code === line.code);
                    const extras = formatSelectedOptions(line.options);
                    return `${line.qty}× ${item?.name ?? line.code}${extras ? ` (${extras})` : ""}`;
                  })
                  .join(" · ")}
              </div>
            </div>
          ) : null}
        </>
      )}

      {selected ? (
        <ProductDetailModal
          item={selected}
          currency={catalog.currency}
          variant="menu"
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 shrink-0 rounded-full border px-3 text-[12px] font-bold"
      style={{
        background: on ? "var(--cat-accent)" : "#fff",
        borderColor: on ? "var(--cat-accent)" : LINE,
        color: on ? "#fff" : MUTED,
      }}
    >
      {label}
    </button>
  );
}

function ReserveItemRow({
  item,
  catalog,
  qty,
  acceptOrders,
  onOpen,
  onInc,
  onDec,
}: {
  item: StorefrontItem;
  catalog: StorefrontCatalog;
  qty: number;
  acceptOrders: boolean;
  onOpen: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const available = isItemAvailable(item);
  const lockAdd = needsOptionPick(item);
  const canStep = acceptOrders && available && !lockAdd;
  const cue = optionsCue(item);
  const initial = item.name.trim()[0]?.toUpperCase() ?? "?";

  function stop(event: { stopPropagation: () => void }) {
    event.stopPropagation();
  }

  const actions =
    !acceptOrders || !available ? (
      available ? null : <span className="text-[11px] text-[var(--cat-muted)]">Unavailable</span>
    ) : canStep ? (
      qty > 0 ? (
        <div className="flex items-center gap-1" onClick={stop}>
          <button type="button" onClick={onDec} aria-label={`Remove one ${item.name}`} className="h-8 w-8 rounded-[7px] border border-[var(--cat-border)] text-[15px] font-bold">
            −
          </button>
          <span className="min-w-3.5 text-center text-[12px] font-bold">{qty}</span>
          <button type="button" onClick={onInc} aria-label={`Add one more ${item.name}`} className="h-8 w-8 rounded-[7px] bg-[var(--cat-accent)] text-[15px] font-bold text-white">
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onInc();
          }}
          aria-label={`Add ${item.name}`}
          className="grid h-8 w-8 place-items-center rounded-[7px] border border-[var(--cat-border)] text-[15px] font-bold"
        >
          +
        </button>
      )
    ) : (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        aria-label={`Choose options for ${item.name}`}
        className="grid h-8 w-8 place-items-center rounded-[7px] border border-[var(--cat-border)] text-[15px] font-bold"
      >
        +
      </button>
    );

  return (
    <article className="flex gap-2 rounded-[10px] border border-[var(--cat-border)] bg-white p-1.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-2 text-left">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[8px] bg-[var(--cat-photo-bg)]">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" className={`h-full w-full ${imageFitClass(item.imageFit)}`} />
          ) : (
            <span className="font-catalog-display grid h-full place-items-center text-[22px] font-semibold text-[var(--cat-muted)]">
              {initial}
            </span>
          )}
          {qty > 0 ? (
            <span
              className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: catalog.accent }}
            >
              {qty}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="m-0 line-clamp-2 text-[13.5px] font-semibold">{item.name}</h3>
          {cue ? <p className="m-0 mt-0.5 text-[11px] font-semibold text-[var(--cat-accent)]">{cue}</p> : null}
          <div className="mt-auto pt-1 text-[13px] font-semibold">{formatMoney(item.price, catalog.currency)}</div>
        </div>
      </button>
      <div className="flex shrink-0 items-end">{actions}</div>
    </article>
  );
}
