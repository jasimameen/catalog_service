"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/catalog/currency";
import {
  formatComboIncludes,
  isComboItem,
  parseComboLines,
  type ComboLine,
} from "@/lib/catalog/combos";
import type { CatalogItemRow } from "@/lib/supabase/types";
import { addCombo, updateCombo } from "./actions";
import {
  AdminSheet,
  AdminSheetBody,
  AdminSheetFooter,
  AdminSheetHeader,
  btnGhost,
  btnPrimary,
  fieldInput,
  fieldLabel,
} from "./sheet";

export function ComboModal({
  catalogId,
  items,
  currency,
  editing,
  onClose,
}: {
  catalogId: string;
  items: CatalogItemRow[];
  currency: string;
  editing?: CatalogItemRow | null;
  onClose: () => void;
}) {
  const products = useMemo(
    () => items.filter((item) => !isComboItem(item) && item.id !== editing?.id),
    [items, editing?.id],
  );
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState(editing ? String(Number(editing.price)) : "");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const line of parseComboLines(editing?.combo_lines)) next[line.item_id] = line.qty;
    return next;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = products.filter((item) => picked[item.id]);
    const rest = products.filter((item) => !picked[item.id]);
    const match = (item: CatalogItemRow) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return [...selected.filter(match), ...rest.filter(match)];
  }, [products, picked, query]);

  const lines: ComboLine[] = products
    .filter((item) => picked[item.id])
    .map((item) => ({ item_id: item.id, qty: picked[item.id] ?? 1 }));
  const includeText = formatComboIncludes(
    lines
      .map((line) => {
        const item = products.find((row) => row.id === line.item_id);
        return item ? { name: item.name, qty: line.qty } : null;
      })
      .filter((row): row is { name: string; qty: number } => row !== null),
  );

  function toggle(id: string) {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    const nextQty = Math.max(1, Math.min(99, Math.floor(qty) || 1));
    setPicked((prev) => ({ ...prev, [id]: nextQty }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateCombo(catalogId, editing.id, name, price, lines)
        : await addCombo(catalogId, name, price, lines);
      if (result.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <AdminSheet onClose={onClose} maxWidth="max-w-[520px]" labelledBy="combo-sheet-title">
      <AdminSheetHeader
        id="combo-sheet-title"
        title={editing ? "Edit combo" : "Add combo"}
        helper="Pick products and set one price for the set."
        onClose={onClose}
      />
      <AdminSheetBody>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-1 basis-[200px] flex-col gap-1.5">
            <span className={fieldLabel}>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldInput} />
          </label>
          <label className="flex flex-[0_1_150px] flex-col gap-1.5">
            <span className={fieldLabel}>Combo price</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={fieldInput}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Products</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
            className={fieldInput}
          />
        </label>
        <div className="max-h-[260px] overflow-y-auto rounded-xl border border-[#e2e7ee]">
          {visible.length === 0 ? (
            <p className="px-[26px] py-[26px] text-center text-[13px] text-[#8a93a2]">
              No products to add.
            </p>
          ) : (
            visible.map((item) => {
              const on = Boolean(picked[item.id]);
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-[#f1f4f8] px-3.5 py-2.5 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(item.id)}
                    className="h-[17px] w-[17px] accent-[#0b5fce]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-[#101720]">{item.name}</span>
                    <span className="block truncate text-[12px] text-[#8a93a2]">
                      {formatMoney(Number(item.price), currency)}
                      {item.code ? ` · ${item.code}` : ""}
                    </span>
                  </span>
                  {on ? (
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={picked[item.id] ?? 1}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setQty(item.id, Number(e.target.value))}
                      className="h-10 w-[70px] rounded-[10px] border border-[#e2e7ee] bg-white px-2 text-center text-[14px]"
                    />
                  ) : null}
                </label>
              );
            })
          )}
        </div>
        <p className="m-0 text-[13px] leading-snug text-[#46505e]">
          Includes {includeText || "—"}
        </p>
        {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
      </AdminSheetBody>
      <AdminSheetFooter>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button type="button" disabled={pending} onClick={save} className={btnPrimary}>
          {pending ? "Saving…" : editing ? "Save combo" : "Add combo"}
        </button>
      </AdminSheetFooter>
    </AdminSheet>
  );
}
