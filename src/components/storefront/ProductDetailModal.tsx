"use client";

import { useMemo, useState } from "react";
import type { SelectedOption } from "@/lib/supabase/types";
import type { StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { formatMoney } from "@/lib/catalog/currency";
import { hasItemOptions, unitPriceWithOptions } from "@/lib/catalog/item-options";
import { QuantityStepper } from "./QuantityStepper";
import { imageFitClass, isItemAvailable } from "@/lib/catalog/merchandising";
import { PausedNote } from "./PausedNote";

const QUICK_MULTIPLES = [6, 12, 24];

export function ProductDetailModal({
  item,
  currency,
  onClose,
}: {
  item: StorefrontItem;
  currency: string;
  onClose: () => void;
}) {
  const { quantities, increment, decrement, setQuantity, addLine, incrementLine, decrementLine, lineFor, acceptOrders, pausedMessage } =
    useCart();
  const optioned = hasItemOptions(item);
  const [singlePick, setSinglePick] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const group of item.options) {
      if (group.type === "single" && group.required && group.values[0]) {
        initial[group.name] = group.values[0].name;
      }
    }
    return initial;
  });
  const [multiPick, setMultiPick] = useState<Record<string, string[]>>({});
  const [localQty, setLocalQty] = useState(1);

  const selected: SelectedOption[] = useMemo(() => {
    const rows: SelectedOption[] = [];
    for (const group of item.options) {
      if (group.type === "single") {
        const name = singlePick[group.name];
        const value = group.values.find((v) => v.name === name);
        if (value) rows.push({ group: group.name, values: [value] });
      } else {
        const names = multiPick[group.name] ?? [];
        const values = group.values.filter((v) => names.includes(v.name));
        if (values.length > 0) rows.push({ group: group.name, values });
      }
    }
    return rows;
  }, [item.options, singlePick, multiPick]);

  const missingRequired = item.options.filter((group) => {
    if (!group.required || group.values.length === 0) return false;
    if (group.type === "single") return !singlePick[group.name];
    return (multiPick[group.name] ?? []).length === 0;
  });

  const unit = unitPriceWithOptions(item.price, selected);
  const existing = optioned ? lineFor(item.code, selected) : undefined;
  const qty = optioned ? (existing?.qty ?? 0) : (quantities[item.code] ?? 0);

  function toggleMulti(groupName: string, valueName: string) {
    setMultiPick((prev) => {
      const current = prev[groupName] ?? [];
      const next = current.includes(valueName)
        ? current.filter((n) => n !== valueName)
        : [...current, valueName];
      return { ...prev, [groupName]: next };
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:max-h-[90vh] sm:flex-row sm:rounded-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[584/480] w-full shrink-0 bg-[var(--cat-photo-bg)] sm:aspect-auto sm:w-1/2">
          {item.image ? (
            // User-pasted https/data URLs are not in next/image remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              width={584}
              height={480}
              decoding="async"
              className={`absolute inset-0 h-full w-full ${imageFitClass(item.imageFit)}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--cat-muted)]">
              No photo yet
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-[var(--cat-muted)] shadow hover:bg-white"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          <div>
            <h2 className="font-catalog-display text-xl font-bold text-[var(--cat-ink)]">
              {item.name}
            </h2>
            {item.code && <p className="text-sm text-[var(--cat-muted)]">{item.code}</p>}
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-[var(--cat-muted)]">{item.description}</p>
          )}

          {optioned
            ? item.options.map((group) => (
                <div key={group.name}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--cat-muted)]">
                    {group.name}
                    {group.required ? " *" : " · optional"}
                    {group.type === "multi" ? " · extras" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => {
                      const selectedValue =
                        group.type === "single"
                          ? singlePick[group.name] === value.name
                          : (multiPick[group.name] ?? []).includes(value.name);
                      const extra =
                        value.price_delta === 0
                          ? ""
                          : value.price_delta > 0
                            ? ` +${formatMoney(value.price_delta, currency)}`
                            : ` ${formatMoney(value.price_delta, currency)}`;
                      return (
                        <button
                          key={value.name}
                          type="button"
                          onClick={() =>
                            group.type === "single"
                              ? setSinglePick((prev) => ({ ...prev, [group.name]: value.name }))
                              : toggleMulti(group.name, value.name)
                          }
                          className={`min-h-11 rounded-full border px-3.5 text-sm font-medium ${
                            selectedValue
                              ? "border-[var(--cat-accent)] bg-[var(--cat-accent)] text-white"
                              : "border-[var(--cat-border)] bg-white text-[var(--cat-ink)]"
                          }`}
                        >
                          {value.name}
                          {extra}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            : null}

          <div className="mt-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--cat-muted)]">
              {currency}
            </p>
            <p className="text-2xl font-bold text-[var(--cat-ink)]">{unit.toFixed(2)}</p>
            {qty > 0 && (
              <p className="text-xs text-[var(--cat-muted)]">
                × {qty} = {formatMoney(unit * qty, currency)}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-2 pt-2">
            {!acceptOrders ? (
              <PausedNote message={pausedMessage} />
            ) : !isItemAvailable(item) ? (
              <p className="min-h-11 rounded-[9px] bg-slate-100 py-2.5 text-center text-sm font-semibold text-[var(--cat-muted)]">
                Unavailable
              </p>
            ) : optioned ? (
              <>
                {existing ? (
                  <QuantityStepper
                    qty={existing.qty}
                    label={item.name}
                    onDecrement={() => decrementLine(existing.key)}
                    onIncrement={() => incrementLine(existing.key)}
                  />
                ) : (
                  <>
                    <QuantityStepper
                      qty={localQty}
                      label={item.name}
                      onDecrement={() => setLocalQty((n) => Math.max(1, n - 1))}
                      onIncrement={() => setLocalQty((n) => n + 1)}
                    />
                    <button
                      type="button"
                      disabled={missingRequired.length > 0}
                      onClick={() => addLine(item.code, selected, localQty)}
                      className="min-h-11 w-full rounded-[9px] border border-[var(--cat-accent)] bg-white py-2.5 text-sm font-semibold text-[var(--cat-accent)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {missingRequired.length > 0
                        ? `Choose ${missingRequired[0]!.name}`
                        : `Add ${localQty} to order`}
                    </button>
                  </>
                )}
              </>
            ) : qty === 0 ? (
              <button
                type="button"
                onClick={() => increment(item.code)}
                className="min-h-11 w-full rounded-[9px] border border-[var(--cat-accent)] bg-white py-2.5 text-sm font-semibold text-[var(--cat-accent)] transition hover:bg-slate-50"
              >
                Add to order
              </button>
            ) : (
              <>
                <QuantityStepper
                  qty={qty}
                  label={item.name}
                  onDecrement={() => decrement(item.code)}
                  onIncrement={() => increment(item.code)}
                />
                <div className="flex gap-1.5">
                  {QUICK_MULTIPLES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(item.code, n)}
                      className="min-h-11 flex-1 rounded-full bg-slate-100 text-xs font-medium text-[var(--cat-muted)] hover:bg-slate-200"
                    >
                      ×{n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
