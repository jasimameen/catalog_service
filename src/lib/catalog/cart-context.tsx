"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PRODUCTS } from "@/data/catalog-products";

const STORAGE_KEY = "kleaner-catalog-cart";

type CartMap = Record<string, number>;

interface CartContextValue {
  quantities: CartMap;
  itemCount: number;
  subtotal: number;
  setQuantity: (code: string, qty: number) => void;
  increment: (code: string) => void;
  decrement: (code: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as CartMap;
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [quantities, setQuantities] = useState<CartMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setQuantities(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }, [quantities, hydrated]);

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

  const { itemCount, subtotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const [code, qty] of Object.entries(quantities)) {
      const product = PRODUCTS.find((p) => p.code === code);
      if (!product) continue;
      count += qty;
      total += product.price * qty;
    }
    return { itemCount: count, subtotal: total };
  }, [quantities]);

  return (
    <CartContext.Provider
      value={{ quantities, itemCount, subtotal, setQuantity, increment, decrement, clear }}
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
