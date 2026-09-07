"use client";

import { useState } from "react";
import { CatalogClient } from "./CatalogClient";
import { CartPanel, type OrderResult } from "./CartPanel";

export function CatalogApp() {
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);

  if (order) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kl-success-bg)]">
          <span className="text-3xl text-[var(--kl-success-ink)]">✓</span>
        </div>
        <h1 className="font-catalog-display text-2xl font-bold text-[var(--kl-ink)]">
          Order placed
        </h1>
        <p className="mt-2 text-sm text-[var(--kl-muted)]">
          We&apos;ll call {order.phone} to confirm stock and delivery for {order.shopName}.
        </p>
        <div className="mt-6 w-full rounded-[14px] border border-[var(--kl-border)] bg-white p-4 text-left">
          <Row label="Reference" value={order.reference} bold />
          <Row
            label="Items"
            value={`${order.itemCount} unit${order.itemCount === 1 ? "" : "s"} · ${order.lineCount} line${order.lineCount === 1 ? "" : "s"}`}
          />
          <Row label="Subtotal" value={`QAR ${order.total.toFixed(2)}`} bold last />
        </div>
        <button
          type="button"
          onClick={() => setOrder(null)}
          className="mt-6 w-full rounded-[9px] bg-[var(--kl-blue)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--kl-blue-dark)]"
        >
          Back to catalogue
        </button>
      </main>
    );
  }

  return (
    <main>
      <CatalogClient onOpenCart={() => setCartOpen(true)} />
      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onPlaced={(result) => {
          setCartOpen(false);
          setOrder(result);
        }}
      />
    </main>
  );
}

function Row({
  label,
  value,
  bold,
  last,
}: {
  label: string;
  value: string;
  bold?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <span className="text-[var(--kl-muted)]">{label}</span>
      <span className={bold ? "font-bold text-[var(--kl-ink)]" : "text-[var(--kl-ink)]"}>
        {value}
      </span>
    </div>
  );
}
