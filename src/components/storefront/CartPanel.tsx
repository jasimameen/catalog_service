"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/catalog/cart-context";
import { formatMoney } from "@/lib/catalog/currency";
import type { OrderResult } from "@/lib/catalog/order-types";

type Step = "review" | "delivery";
type Status = "idle" | "submitting" | "error";

export function CartPanel({
  catalogId,
  currency,
  open,
  onClose,
  onPlaced,
}: {
  catalogId: string;
  currency: string;
  open: boolean;
  onClose: () => void;
  onPlaced: (result: OrderResult) => void;
}) {
  const { items, quantities, itemCount, lineCount, subtotal, increment, decrement, clear } =
    useCart();
  const [step, setStep] = useState<Step>("review");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const cartItems = Object.entries(quantities)
    .map(([code, qty]) => {
      const item = items.find((p) => p.code === code);
      return item ? { item, qty } : null;
    })
    .filter((entry): entry is { item: (typeof items)[number]; qty: number } => entry !== null);

  const missing: string[] = [];
  if (!shopName.trim()) missing.push("shop");
  if (!phone.trim()) missing.push("phone");
  if (!location.trim()) missing.push("address");
  const canSubmit = missing.length === 0;

  function submitLabel() {
    if (status === "submitting") return "Sending order…";
    if (missing.length === 0) return "Place order";
    if (missing.length === 3) return "Fill shop, phone and address";
    return `Fill ${missing.join(" and ")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || cartItems.length === 0) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/catalog/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId,
          shopName,
          phone,
          location,
          mapsLink,
          notes,
          items: cartItems.map(({ item, qty }) => ({ code: item.code, qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      const result: OrderResult = {
        reference: data.reference,
        total: data.total,
        itemCount: data.itemCount,
        lineCount: data.lineCount,
        shopName,
        phone,
      };
      clear();
      setShopName("");
      setPhone("");
      setLocation("");
      setMapsLink("");
      setNotes("");
      setStep("review");
      setStatus("idle");
      onPlaced(result);
    } catch {
      setErrorMessage("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--cat-border)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            {step === "delivery" && (
              <button
                type="button"
                onClick={() => setStep("review")}
                aria-label="Back to order"
                className="rounded-full p-1 text-lg text-[var(--cat-muted)] hover:bg-slate-100"
              >
                ←
              </button>
            )}
            <h2 className="text-lg font-bold text-[var(--cat-ink)]">
              {step === "review" ? "Your order" : "Delivery details"}
            </h2>
            {step === "review" && (
              <span className="text-sm text-[var(--cat-muted)]">
                {itemCount} unit{itemCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="rounded-full bg-slate-100 p-1.5 text-lg leading-none text-[var(--cat-muted)] hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cartItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--cat-muted)]">
              Your cart is empty. Add some products to get started.
            </p>
          ) : step === "review" ? (
            <ul className="divide-y divide-slate-100">
              {cartItems.map(({ item, qty }) => (
                <li key={item.code} className="flex items-center gap-3 py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--cat-photo-bg)]">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill sizes="56px" className="object-contain" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--cat-ink)]">{item.name}</p>
                    <p className="text-xs text-[var(--cat-muted)]">
                      {formatMoney(item.price, currency)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => decrement(item.code)}
                      aria-label={`Remove one ${item.name}`}
                      className="h-7 w-7 rounded-full border border-[var(--cat-border)] text-sm font-semibold text-[var(--cat-ink)] hover:bg-slate-100"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center text-sm font-semibold">{qty}</span>
                    <button
                      type="button"
                      onClick={() => increment(item.code)}
                      aria-label={`Add one more ${item.name}`}
                      className="h-7 w-7 rounded-full border border-[var(--cat-border)] text-sm font-semibold text-[var(--cat-ink)] hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-16 shrink-0 text-right text-sm font-semibold text-[var(--cat-ink)]">
                    {(item.price * qty).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <form id="delivery-form" onSubmit={handleSubmit} className="space-y-3">
              <p className="text-sm text-[var(--cat-muted)]">
                No payment now — we confirm stock and price by phone.
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">
                  Shop name *
                </label>
                <input
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Al Nasr Trading"
                  className="w-full rounded-[9px] border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">
                  Phone number *
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+974 3300 0000"
                  className="w-full rounded-[9px] border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">
                  Delivery address *
                </label>
                <textarea
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  rows={2}
                  placeholder="Street, zone, city"
                  className="w-full rounded-[9px] border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">
                  Maps link (optional)
                </label>
                <input
                  value={mapsLink}
                  onChange={(e) => setMapsLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/…"
                  className="w-full rounded-[9px] border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
                />
                <p className="mt-1 text-xs text-[var(--cat-muted)]">
                  Paste a pin from Google Maps and the driver finds you first time.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Delivery window, invoice details"
                  className="w-full rounded-[9px] border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
                />
              </div>
              {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
            </form>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-[var(--cat-border)] px-4 py-3.5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-[var(--cat-muted)]">
                {step === "review"
                  ? "Subtotal"
                  : `${itemCount} unit${itemCount === 1 ? "" : "s"} · ${lineCount} line${lineCount === 1 ? "" : "s"}`}
              </span>
              <span className="text-base font-bold text-[var(--cat-ink)]">
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            {step === "review" ? (
              <button
                type="button"
                onClick={() => setStep("delivery")}
                className="w-full rounded-[9px] bg-[var(--cat-accent)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Continue to delivery details
              </button>
            ) : (
              <button
                type="submit"
                form="delivery-form"
                disabled={!canSubmit || status === "submitting"}
                className="w-full rounded-[9px] bg-[var(--cat-accent)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitLabel()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
