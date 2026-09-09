"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StorefrontItem } from "./types";

type CartMap = Record<string, number>;

interface CartContextValue {
  items: StorefrontItem[];
  quantities: CartMap;
  itemCount: number;
  lineCount: number;
  subtotal: number;
  setQuantity: (code: string, qty: number) => void;
  increment: (code: string) => void;
  decrement: (code: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(catalogId: string) {
  return `catalog-cart:${catalogId}`;
}

function readStoredCart(catalogId: string): CartMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(catalogId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as CartMap;
  } catch {
    return {};
  }
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
  const [quantities, setQuantities] = useState<CartMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deliberate: read localStorage after mount so server and first-client
    // render both start from {} (avoids a hydration mismatch), then sync in
    // the real cart. This is the documented exception to "don't setState in
    // an effect" — synchronizing from an external store (localStorage) that
    // isn't available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuantities(readStoredCart(catalogId));
    setHydrated(true);
  }, [catalogId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(catalogId), JSON.stringify(quantities));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }, [quantities, hydrated, catalogId]);

  const setQuantity = (code: string, qty: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[code];
      } else {
        next[code] = qty;
      }
      return next;
    });
  };

  const increment = (code: string) => {
    setQuantities((prev) => ({ ...prev, [code]: (prev[code] ?? 0) + 1 }));
  };

  const decrement = (code: string) => {
    setQuantities((prev) => {
      const current = prev[code] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[code];
        return next;
      }
      return { ...prev, [code]: current - 1 };
    });
  };

  const clear = () => setQuantities({});

  const { itemCount, lineCount, subtotal } = useMemo(() => {
    let count = 0;
    let lines = 0;
    let total = 0;
    for (const [code, qty] of Object.entries(quantities)) {
      const item = items.find((p) => p.code === code);
      if (!item || qty <= 0) continue;
      count += qty;
      lines += 1;
      total += item.price * qty;
    }
    return { itemCount: count, lineCount: lines, subtotal: total };
  }, [quantities, items]);

  return (
    <CartContext.Provider
      value={{
        items,
        quantities,
        itemCount,
        lineCount,
        subtotal,
        setQuantity,
        increment,
        decrement,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
