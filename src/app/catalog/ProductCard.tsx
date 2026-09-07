"use client";

import Image from "next/image";
import type { Product } from "@/data/catalog-products";
import { useCart } from "@/lib/catalog/cart-context";

export function ProductCard({ product }: { product: Product }) {
  const { quantities, increment, decrement } = useCart();
  const qty = quantities[product.code] ?? 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[584/480] w-full bg-slate-50">
        <Image
          src={product.image}
          alt={product.category}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
          className="object-contain"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">
            {product.category}
          </p>
          <p className="text-xs text-slate-400">{product.code}</p>
        </div>
        <p className="mt-auto text-base font-bold text-sky-700">
          QAR {product.price.toFixed(2)}
        </p>
        {qty === 0 ? (
          <button
            type="button"
            onClick={() => increment(product.code)}
            className="w-full rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98]"
          >
            Add to cart
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-sky-600 overflow-hidden">
            <button
              type="button"
              onClick={() => decrement(product.code)}
              aria-label={`Remove one ${product.category}`}
              className="px-3 py-2 text-lg font-semibold text-sky-700 hover:bg-sky-50"
            >
              −
            </button>
            <span className="min-w-[2ch] text-center text-sm font-semibold text-slate-900">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => increment(product.code)}
              aria-label={`Add one more ${product.category}`}
              className="px-3 py-2 text-lg font-semibold text-sky-700 hover:bg-sky-50"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
