"use client";

import { useCart } from "@/lib/catalog/cart-context";

export function CartButton({ onClick }: { onClick: () => void }) {
  const { itemCount } = useCart();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-[9px] bg-[var(--cat-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
    >
      Cart
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-bold">
        {itemCount}
      </span>
    </button>
  );
}
