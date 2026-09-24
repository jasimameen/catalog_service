import type { CSSProperties } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { recordCatalogView } from "@/lib/catalog/resolve";
import { darken } from "@/lib/catalog/color";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";
import { StorefrontNotice } from "@/components/storefront/StorefrontNotice";
import { ShopPausedNotice } from "@/components/storefront/ShopPausedNotice";
import { catalogStorefrontLive } from "@/lib/billing/account-access";
import { firstQueryValue, storefrontDinePath } from "@/lib/catalog/storefront-paths";
import { decodeStorefrontHost, loadStorefrontCatalog, storefrontReady } from "@/lib/catalog/load-storefront";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ host: string }>;
  searchParams: Promise<{ table?: string | string[] }>;
}) {
  const { host: hostParam } = await params;
  const host = decodeStorefrontHost(hostParam);
  const query = await searchParams;
  const table = firstQueryValue(query.table);
  if (table) {
    redirect(storefrontDinePath(hostParam, table));
  }
  const configured = storefrontReady();
  const catalog = configured ? await loadStorefrontCatalog(hostParam) : null;

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
        body={`No live catalog is published at "${host}" yet. Check the link, or if this is your catalog, make sure it's published from the dashboard.`}
      />
    );
  }

  if (!(await catalogStorefrontLive(catalog.id))) {
    return <ShopPausedNotice name={catalog.name} accent={catalog.accent} />;
  }

  void recordCatalogView(catalog.id);

  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;

  return (
    <div style={style}>
      <Suspense fallback={null}>
        <StorefrontApp catalog={catalog} />
      </Suspense>
    </div>
  );
}
