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
import { isRestaurantCatalog } from "@/lib/catalog/template-settings";
import { StorefrontSessionProvider } from "./StorefrontSession";
import { DineInPresenceGate } from "./DineInPresenceGate";
import { StorefrontMarquee } from "./StorefrontMarquee";
import { PausedNote } from "./PausedNote";
import { trackingPath } from "@/lib/catalog/order-tracking";

export function StorefrontApp({ catalog }: { catalog: StorefrontCatalog }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [category, setCategory] = useState("");
  const searchParams = useSearchParams();
  const forcedTemplate = searchParams.get("tpl");
  const templateKey = forcedTemplate && isTemplateKey(forcedTemplate) ? forcedTemplate : catalog.template;
  const Template = TEMPLATE_COMPONENTS[templateKey] ?? TEMPLATE_COMPONENTS.grid;
  const restaurant = isRestaurantCatalog(templateKey, catalog.fulfillmentModes);
  const showChips = !restaurant && storefrontCategories(catalog.items).length >= 2;
  const initialTable = (searchParams.get("table") ?? "").trim();
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
    <StorefrontSessionProvider catalog={viewCatalog} restaurant={restaurant} initialTable={initialTable}>
      <DineInPresenceGate />
      {order ? (
        <OrderConfirmation catalog={catalog} restaurant={restaurant} order={order} onBack={() => setOrder(null)} />
      ) : (
        <main className="@container">
          {catalog.showStorefrontAlert && catalog.storefrontAlert ? (
            <StorefrontMarquee text={catalog.storefrontAlert} tone="ink" />
          ) : null}
          {!catalog.acceptOrders ? <PausedNote message={catalog.ordersPausedMessage} /> : null}
          {!restaurant ? <StorefrontHero banners={catalog.banners} /> : null}
          <Template
            catalog={viewCatalog}
            onOpenCart={() => setCartOpen(true)}
            filters={
              showChips ? (
                <CategoryChips items={catalog.items} selected={category} onSelect={setCategory} />
              ) : undefined
            }
            featured={restaurant ? undefined : <FeaturedStrip catalog={catalog} />}
          />
          {!restaurant ? <StorefrontFooter catalog={catalog} /> : null}
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
    </StorefrontSessionProvider>
    </CartProvider>
  );
}

function trackHref(order: OrderResult, slug: string): string | undefined {
  if (order.trackPath) return order.trackPath;
  if (order.trackToken) return trackingPath(slug, order.trackToken);
  return order.trackUrl;
}

function OrderConfirmation({
  catalog,
  restaurant,
  order,
  onBack,
}: {
  catalog: StorefrontCatalog;
  restaurant: boolean;
  order: OrderResult;
  onBack: () => void;
}) {
  const href = trackHref(order, catalog.slug);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cat-success-bg)]">
        <span className="text-3xl text-[var(--cat-success-ink)]">✓</span>
      </div>
      <h1 className="font-catalog-display text-2xl font-bold text-[var(--cat-ink)]">
        {restaurant ? `Order received at ${catalog.name}` : "Order placed"}
      </h1>
      <p className="mt-2 text-sm text-[var(--cat-muted)]">
        {restaurant
          ? order.phone
            ? `${catalog.name} will confirm on ${order.phone}.`
            : `${catalog.name} has your order.`
          : order.phone
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
      {href ? (
        <a
          href={href}
          className="mt-6 flex w-full items-center justify-center rounded-[9px] bg-[var(--cat-accent)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Track order
        </a>
      ) : null}
      <button
        type="button"
        onClick={onBack}
        className={
          href
            ? "mt-3 w-full rounded-[9px] border border-[var(--cat-border)] bg-white py-2.5 text-sm font-semibold text-[var(--cat-ink)] transition hover:bg-[var(--cat-photo-bg)]"
            : "mt-6 w-full rounded-[9px] bg-[var(--cat-accent)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        }
      >
        {restaurant ? "Back to menu" : "Back to catalogue"}
      </button>
      <StorefrontWatermark />
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
      <span className="text-[var(--cat-muted)]">{label}</span>
      <span className={bold ? "font-bold text-[var(--cat-ink)]" : "text-[var(--cat-ink)]"}>
        {value}
      </span>
    </div>
  );
}
