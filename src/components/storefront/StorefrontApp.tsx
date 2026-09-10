"use client";

import { useState } from "react";
import type { StorefrontCatalog } from "@/lib/catalog/types";
import { CartProvider } from "@/lib/catalog/cart-context";
import { TEMPLATE_COMPONENTS } from "@/components/templates";
import { CartPanel } from "./CartPanel";
import { StorefrontWatermark } from "./StorefrontWatermark";
import type { OrderResult } from "@/lib/catalog/order-types";
import { formatMoney } from "@/lib/catalog/currency";

export function StorefrontApp({ catalog }: { catalog: StorefrontCatalog }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const Template = TEMPLATE_COMPONENTS[catalog.template] ?? TEMPLATE_COMPONENTS.grid;

  return (
    <CartProvider catalogId={catalog.id} items={catalog.items}>
      {order ? (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cat-success-bg)]">
            <span className="text-3xl text-[var(--cat-success-ink)]">✓</span>
          </div>
          <h1 className="font-catalog-display text-2xl font-bold text-[var(--cat-ink)]">
            Order placed
          </h1>
          <p className="mt-2 text-sm text-[var(--cat-muted)]">
            {order.phone
              ? `We'll call ${order.phone} to confirm stock and delivery${order.shopName ? ` for ${order.shopName}` : ""}.`
              : `We'll confirm stock and delivery${order.shopName ? ` for ${order.shopName}` : ""}.`}
          </p>
          <div className="mt-6 w-full rounded-[14px] border border-[var(--cat-border)] bg-white p-4 text-left">
            <Row label="Reference" value={order.reference} bold />
            <Row
              label="Items"
              value={`${order.itemCount} unit${order.itemCount === 1 ? "" : "s"} · ${order.lineCount} line${order.lineCount === 1 ? "" : "s"}`}
            />
            <Row label="Subtotal" value={formatMoney(order.total, catalog.currency)} bold last />
          </div>
          <button
            type="button"
            onClick={() => setOrder(null)}
            className="mt-6 w-full rounded-[9px] bg-[var(--cat-accent)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Back to catalogue
          </button>
          <StorefrontWatermark />
        </main>
      ) : (
        <main>
          <Template catalog={catalog} onOpenCart={() => setCartOpen(true)} />
          <StorefrontWatermark />
          <CartPanel
            catalogId={catalog.id}
            currency={catalog.currency}
            checkoutFields={catalog.checkoutFields}
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            onPlaced={(result) => {
              setCartOpen(false);
              setOrder(result);
            }}
          />
        </main>
      )}
    </CartProvider>
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
      <span className="text-[var(--cat-muted)]">{label}</span>
      <span className={bold ? "font-bold text-[var(--cat-ink)]" : "text-[var(--cat-ink)]"}>
        {value}
      </span>
    </div>
  );
}
