"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SelectedOption } from "@/lib/supabase/types";
import type { StorefrontItem } from "./types";
import { lineKey, unitPriceWithOptions } from "./item-options";

export type CartLine = {
  key: string;
  code: string;
  qty: number;
  options: SelectedOption[];
};

type LineMap = Record<string, CartLine>;

interface CartContextValue {
  items: StorefrontItem[];
  quantities: Record<string, number>;
  lines: CartLine[];
  itemCount: number;
  lineCount: number;
  subtotal: number;
  setQuantity: (code: string, qty: number) => void;
  increment: (code: string) => void;
  decrement: (code: string) => void;
  addLine: (code: string, options: SelectedOption[], qty?: number) => void;
  incrementLine: (key: string) => void;
  decrementLine: (key: string) => void;
  setLineQuantity: (key: string, qty: number) => void;
  lineFor: (code: string, options: SelectedOption[]) => CartLine | undefined;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(catalogId: string) {
  return `catalog-cart:${catalogId}`;
}

function normalizeOptions(options: SelectedOption[]): SelectedOption[] {
  return options
    .map((group) => ({
      group: group.group,
      values: group.values.filter((v) => v.name),
    }))
    .filter((group) => group.values.length > 0);
}

function readStoredCart(catalogId: string): LineMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(catalogId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "v" in parsed) {
      const bag = parsed as { v?: number; lines?: unknown };
      if (bag.v === 2 && bag.lines && typeof bag.lines === "object" && !Array.isArray(bag.lines)) {
        const lines: LineMap = {};
        for (const [key, value] of Object.entries(bag.lines as Record<string, unknown>)) {
          if (!value || typeof value !== "object" || Array.isArray(value)) continue;
          const row = value as Record<string, unknown>;
          const code = typeof row.code === "string" ? row.code : "";
          const qty = Math.floor(Number(row.qty));
          if (!code || !Number.isFinite(qty) || qty <= 0) continue;
          const options = Array.isArray(row.options) ? (row.options as SelectedOption[]) : [];
          const clean = normalizeOptions(options);
          const nextKey = lineKey(code, clean);
          lines[nextKey] = { key: nextKey, code, qty, options: clean };
          void key;
        }
        return lines;
      }
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const lines: LineMap = {};
    for (const [code, qtyRaw] of Object.entries(parsed as Record<string, unknown>)) {
      const qty = Math.floor(Number(qtyRaw));
      if (!code || !Number.isFinite(qty) || qty <= 0) continue;
      lines[code] = { key: code, code, qty, options: [] };
    }
    return lines;
  } catch {
    return {};
  }
}

function writeLine(prev: LineMap, code: string, options: SelectedOption[], qty: number): LineMap {
  const clean = normalizeOptions(options);
  const key = lineKey(code, clean);
  const next = { ...prev };
  if (qty <= 0) {
    delete next[key];
  } else {
    next[key] = { key, code, qty, options: clean };
  }
  return next;
}

/**
 * Cart state, scoped to one catalog (`catalogId`). Each tenant storefront
 * mounts its own provider around itself, keyed by its own catalog id, so
 * carts from different catalogs never mix in the same browser.
 */
export function CartProvider({
  catalogId,
  items,
  children,
}: {
  catalogId: string;
  items: StorefrontItem[];
  children: ReactNode;
}) {
  const [lineMap, setLineMap] = useState<LineMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deliberate: read localStorage after mount so server and first-client
    // render both start from {} (avoids a hydration mismatch), then sync in
    // the real cart. This is the documented exception to "don't setState in
    // an effect" — synchronizing from an external store (localStorage) that
    // isn't available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLineMap(readStoredCart(catalogId));
    setHydrated(true);
  }, [catalogId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        storageKey(catalogId),
        JSON.stringify({ v: 2, lines: lineMap }),
      );
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }, [lineMap, hydrated, catalogId]);

  const setQuantity = useCallback((code: string, qty: number) => {
    const item = items.find((p) => p.code === code);
    if (item && item.available === false) return;
    setLineMap((prev) => writeLine(prev, code, [], qty));
  }, [items]);

  const increment = useCallback((code: string) => {
    const item = items.find((p) => p.code === code);
    if (item && item.available === false) return;
    setLineMap((prev) => {
      const current = prev[code]?.qty ?? 0;
      return writeLine(prev, code, prev[code]?.options ?? [], current + 1);
    });
  }, [items]);

  const decrement = useCallback((code: string) => {
    setLineMap((prev) => {
      const current = prev[code]?.qty ?? 0;
      return writeLine(prev, code, prev[code]?.options ?? [], current - 1);
    });
  }, []);

  const addLine = useCallback((code: string, options: SelectedOption[], qty = 1) => {
    const item = items.find((p) => p.code === code);
    if (item && item.available === false) return;
    const add = Math.max(1, Math.floor(qty));
    setLineMap((prev) => {
      const key = lineKey(code, normalizeOptions(options));
      const current = prev[key]?.qty ?? 0;
      return writeLine(prev, code, options, current + add);
    });
  }, [items]);

  const incrementLine = useCallback((key: string) => {
    setLineMap((prev) => {
      const line = prev[key];
      if (!line) return prev;
      const item = items.find((p) => p.code === line.code);
      if (item && item.available === false) return prev;
      return writeLine(prev, line.code, line.options, line.qty + 1);
    });
  }, [items]);

  const decrementLine = useCallback((key: string) => {
    setLineMap((prev) => {
      const line = prev[key];
      if (!line) return prev;
      return writeLine(prev, line.code, line.options, line.qty - 1);
    });
  }, []);

  const setLineQuantity = useCallback((key: string, qty: number) => {
    setLineMap((prev) => {
      const line = prev[key];
      if (!line) return prev;
      return writeLine(prev, line.code, line.options, qty);
    });
  }, []);

  const lineFor = useCallback(
    (code: string, options: SelectedOption[]) => lineMap[lineKey(code, normalizeOptions(options))],
    [lineMap],
  );

  const clear = useCallback(() => setLineMap({}), []);

  const lines = useMemo(() => Object.values(lineMap), [lineMap]);

  const { quantities, itemCount, lineCount, subtotal } = useMemo(() => {
    const quantities: Record<string, number> = {};
    let count = 0;
    let total = 0;
    for (const line of lines) {
      const item = items.find((p) => p.code === line.code);
      if (!item || line.qty <= 0) continue;
      quantities[line.code] = (quantities[line.code] ?? 0) + line.qty;
      count += line.qty;
      const priced = unitPriceWithOptions(item.price, line.options);
      total += priced * line.qty;
    }
    return {
      quantities,
      itemCount: count,
      lineCount: lines.filter((l) => l.qty > 0 && items.some((p) => p.code === l.code)).length,
      subtotal: total,
    };
  }, [lines, items]);

  const value = useMemo(
    () => ({
      items,
      quantities,
      lines,
      itemCount,
      lineCount,
      subtotal,
      setQuantity,
      increment,
      decrement,
      addLine,
      incrementLine,
      decrementLine,
      setLineQuantity,
      lineFor,
      clear,
    }),
    [
      items,
      quantities,
      lines,
      itemCount,
      lineCount,
      subtotal,
      setQuantity,
      increment,
      decrement,
      addLine,
      incrementLine,
      decrementLine,
      setLineQuantity,
      lineFor,
      clear,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
