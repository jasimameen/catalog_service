"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { StorefrontCatalog } from "@/lib/catalog/types";
import { CartProvider } from "@/lib/catalog/cart-context";
import { TEMPLATE_COMPONENTS } from "@/components/templates";
import { CartPanel } from "./CartPanel";
import { StorefrontWatermark } from "./StorefrontWatermark";
import { StorefrontHero } from "./StorefrontHero";
import { FeaturedStrip } from "./FeaturedStrip";
import { CategoryChips } from "./CategoryChips";
import { StorefrontFooter } from "./StorefrontFooter";
import type { OrderResult } from "@/lib/catalog/order-types";
import { formatMoney } from "@/lib/catalog/currency";
import { storefrontCategories } from "@/lib/catalog/merchandising";
import { isTemplateKey } from "@/lib/catalog/templates";

export function StorefrontApp({ catalog }: { catalog: StorefrontCatalog }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [category, setCategory] = useState("");
  const searchParams = useSearchParams();
  const forcedTemplate = searchParams.get("tpl");
  const templateKey = forcedTemplate && isTemplateKey(forcedTemplate) ? forcedTemplate : catalog.template;
  const Template = TEMPLATE_COMPONENTS[templateKey] ?? TEMPLATE_COMPONENTS.grid;
  const showChips = storefrontCategories(catalog.items).length >= 2;
  const viewCatalog = useMemo<StorefrontCatalog>(() => {
    if (!category) return catalog;
    return {
      ...catalog,
      items: catalog.items.filter((item) => item.category.trim() === category),
    };
  }, [catalog, category]);

  return (
    <CartProvider
      catalogId={catalog.id}
      items={catalog.items}
      acceptOrders={catalog.acceptOrders}
      pausedMessage={catalog.ordersPausedMessage}
    >
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
            <Row label="Subtotal" value={formatMoney(order.total, catalog.currency)} bold last={!order.trackUrl} />
            {order.trackUrl ? (
              <div className="pt-2">
                <a href={order.trackUrl} className="text-sm font-semibold text-[var(--cat-accent)]">
                  Track this order
                </a>
              </div>
            ) : null}
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
        <main className="@container">
          {catalog.showStorefrontAlert && catalog.storefrontAlert ? (
            <div className="bg-[var(--cat-ink)] px-4 py-2.5 text-center text-sm font-medium text-white">
              {catalog.storefrontAlert}
            </div>
          ) : null}
          {!catalog.acceptOrders ? (
            <div className="bg-[#fff4e5] px-4 py-2.5 text-center text-sm font-medium text-[#9a5b00]">
              {catalog.ordersPausedMessage}
            </div>
          ) : null}
          <StorefrontHero banners={catalog.banners} />
          <Template
            catalog={viewCatalog}
            onOpenCart={() => setCartOpen(true)}
            filters={
              showChips ? (
                <CategoryChips items={catalog.items} selected={category} onSelect={setCategory} />
              ) : undefined
            }
            featured={<FeaturedStrip catalog={catalog} />}
          />
          <StorefrontFooter catalog={catalog} />
          {catalog.acceptOrders ? (
            <CartPanel
              catalogId={catalog.id}
              currency={catalog.currency}
              checkoutFields={catalog.checkoutFields}
              checkoutForm={catalog.checkoutForm}
              fulfillmentModes={catalog.fulfillmentModes}
              open={cartOpen}
              onClose={() => setCartOpen(false)}
              onPlaced={(result) => {
                setCartOpen(false);
                setOrder(result);
              }}
            />
          ) : null}
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
