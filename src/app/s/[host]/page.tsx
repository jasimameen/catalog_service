import type { CSSProperties } from "react";
import { recordCatalogView } from "@/lib/catalog/resolve";
import { darken } from "@/lib/catalog/color";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";
import { decodeStorefrontHost, loadStorefrontCatalog, storefrontReady } from "@/lib/catalog/load-storefront";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ host: string }>;
}) {
  const { host: hostParam } = await params;
  const host = decodeStorefrontHost(hostParam);
  const configured = storefrontReady();
  const catalog = configured ? await loadStorefrontCatalog(hostParam) : null;

  if (!configured) {
    return (
      <NoticeScreen
        title="Supabase isn't configured yet"
        body="This storefront can't load its catalog until SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY are set. See SETUP.md."
      />
    );
  }

  if (!catalog) {
    return (
      <NoticeScreen
        title="This catalog isn't available"
        body={`No live catalog is published at "${host}" yet. Check the link, or if this is your catalog, make sure it's published from the dashboard.`}
      />
    );
  }

  void recordCatalogView(catalog.id);

  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;

  return (
    <div style={style}>
      <StorefrontApp catalog={catalog} />
    </div>
  );
}

function NoticeScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-catalog-display text-2xl font-bold text-[var(--cat-ink)]">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--cat-muted)]">{body}</p>
    </main>
  );
}
