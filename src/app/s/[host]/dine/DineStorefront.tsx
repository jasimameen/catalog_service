import type { CSSProperties } from "react";
import { Suspense } from "react";
import { darken } from "@/lib/catalog/color";
import { loadStorefrontCatalog, storefrontReady } from "@/lib/catalog/load-storefront";
import { catalogOffersDineIn, menuHrefForHost } from "@/lib/catalog/storefront-paths";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";
import { StorefrontNotice } from "@/components/storefront/StorefrontNotice";
import { ShopPausedNotice } from "@/components/storefront/ShopPausedNotice";
import { catalogStorefrontLive } from "@/lib/billing/account-access";

export async function DineStorefront({ host, table }: { host: string; table?: string }) {
  const configured = storefrontReady();
  const catalog = configured ? await loadStorefrontCatalog(host) : null;

  if (!configured) {
    return (
      <StorefrontNotice
        title="Supabase isn't configured yet"
        body="This storefront can't load its catalog until SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY are set. See SETUP.md."
      />
    );
  }

  if (!catalog) {
    return (
      <StorefrontNotice
        title="This catalog isn't available"
        body={`No live catalog is published at "${host}" yet.`}
      />
    );
  }

  if (!(await catalogStorefrontLive(catalog.id))) {
    return <ShopPausedNotice name={catalog.name} accent={catalog.accent} />;
  }

  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;
  const menuHref = menuHrefForHost(host, catalog.slug);

  if (!catalogOffersDineIn(catalog.fulfillmentModes)) {
    const hideTakeaway = catalog.settings.restaurant.hideTakeawayOnDine;
    return (
      <div style={style}>
        <StorefrontNotice
          title="Dine-in is off"
          body={
            hideTakeaway
              ? `${catalog.name} is not taking table orders right now.`
              : `${catalog.name} is not taking table orders right now. Pickup and delivery stay on the regular menu.`
          }
          accent={catalog.accent}
          action={
            hideTakeaway ? undefined : (
              <a
                href={menuHref}
                className="mt-5 inline-flex min-h-11 items-center font-bold text-[var(--cat-accent)]"
              >
                Browse the menu
              </a>
            )
          }
        />
      </div>
    );
  }

  return (
    <div style={style}>
      <Suspense fallback={null}>
        <StorefrontApp catalog={catalog} channel="dine" initialTable={table?.trim() ?? ""} />
      </Suspense>
    </div>
  );
}
