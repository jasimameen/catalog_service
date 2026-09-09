import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveCatalogByHost, recordCatalogView } from "@/lib/catalog/resolve";
import { darken } from "@/lib/catalog/color";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";

export const dynamic = "force-dynamic";

function decodeHost(hostParam: string): string {
  try {
    return decodeURIComponent(hostParam);
  } catch {
    return hostParam;
  }
}

function storefrontReady(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function loadCatalog(hostParam: string) {
  const host = decodeHost(hostParam);
  if (!storefrontReady()) return { host, catalog: null, configured: false as const };
  try {
    const catalog = await resolveCatalogByHost(host);
    return { host, catalog, configured: true as const };
  } catch (error) {
    console.error("Storefront: failed to load catalog", error);
    return { host, catalog: null, configured: true as const };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}): Promise<Metadata> {
  const { host: hostParam } = await params;
  const { catalog, configured } = await loadCatalog(hostParam);
  if (!configured) return { title: "Not configured" };
  if (!catalog) return { title: "Catalog not found" };
  return {
    title: `${catalog.name} — Order online`,
    robots: { index: false, follow: false },
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ host: string }>;
}) {
  const { host: hostParam } = await params;
  const { host, catalog, configured } = await loadCatalog(hostParam);

  if (!configured) {
    return (
      <NoticeScreen
        title="Supabase isn't configured yet"
        body="This storefront can't load its catalog until NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set. See SETUP.md."
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
