"use client";

import { useState } from "react";
import Image from "next/image";
import { PRODUCTS } from "@/data/catalog-products";
import { useCart } from "@/lib/catalog/cart-context";

type Status = "idle" | "submitting" | "success" | "error";

export function CartPanel() {
  const { quantities, itemCount, subtotal, increment, decrement, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const cartItems = Object.entries(quantities)
    .map(([code, qty]) => {
      const product = PRODUCTS.find((p) => p.code === code);
      return product ? { product, qty } : null;
    })
    .filter((item): item is { product: (typeof PRODUCTS)[number]; qty: number } => item !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/catalog/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          phone,
          location,
          notes,
          items: cartItems.map(({ product, qty }) => ({
            code: product.code,
            category: product.category,
            price: product.price,
            qty,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      clear();
      setShopName("");
      setPhone("");
      setLocation("");
      setNotes("");
    } catch {
      setErrorMessage("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-700 active:scale-95"
      >
        Cart
        {itemCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-sky-700">
            {itemCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-bold text-slate-900">Your order</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="rounded-full p-1 text-2xl leading-none text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {status === "success" ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <p className="text-4xl">✅</p>
                  <p className="text-lg font-semibold text-slate-900">Order sent!</p>
                  <p className="text-sm text-slate-500">
                    We&apos;ve received your order and will be in touch shortly to confirm.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("idle");
                      setOpen(false);
                    }}
                    className="mt-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    Done
                  </button>
                </div>
              ) : cartItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Your cart is empty. Add some products to get started.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-slate-100">
                    {cartItems.map(({ product, qty }) => (
                      <li key={product.code} className="flex items-center gap-3 py-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-50">
                          <Image
                            src={product.image}
                            alt={product.category}
                            fill
                            sizes="56px"
                            className="object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {product.category}
                          </p>
                          <p className="text-xs text-slate-400">
                            QAR {product.price.toFixed(2)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decrement(product.code)}
                            aria-label={`Remove one ${product.category}`}
                            className="h-7 w-7 rounded-full border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="min-w-[2ch] text-center text-sm font-semibold">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => increment(product.code)}
                            aria-label={`Add one more ${product.category}`}
                            className="h-7 w-7 rounded-full border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
                    <span>Subtotal</span>
                    <span>QAR {subtotal.toFixed(2)}</span>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Shop name *
                      </label>
                      <input
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Phone number *
                      </label>
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Location / address *
                      </label>
                      <textarea
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    {status === "error" && (
                      <p className="text-sm text-red-600">{errorMessage}</p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                    >
                      {status === "submitting" ? "Sending order…" : "Place order"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
