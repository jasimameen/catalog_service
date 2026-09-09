import "server-only";
import { getServiceClient } from "@/lib/supabase/service";
import { subdomainSlugFor } from "@/lib/tenant";
import type { StorefrontCatalog } from "./types";
import type { CatalogItemRow, CatalogRow } from "@/lib/supabase/types";

/**
 * Resolves a Host header to a live catalog + its visible items, using the
 * service-role client (public visitors have no Supabase session, so RLS
 * would otherwise block every read). Returns null if there's no live
 * catalog for that host — the storefront page renders a friendly
 * "not available" screen in that case rather than a raw 404.
 */
export async function resolveCatalogByHost(host: string): Promise<StorefrontCatalog | null> {
  const supabase = getServiceClient();
  const lowerHost = host.toLowerCase();
  const slug = subdomainSlugFor(lowerHost);

  let catalogRow: CatalogRow | null = null;

  if (slug) {
    const { data } = await supabase
      .from("catalogs")
      .select("*")
      .eq("slug", slug)
      .eq("status", "live")
      .maybeSingle();
    catalogRow = (data as CatalogRow | null) ?? null;
  } else {
    const { data: domain } = await supabase
      .from("domains")
      .select("catalog_id")
      .eq("hostname", lowerHost)
      .eq("status", "verified")
      .maybeSingle();
    if (domain) {
      const { data } = await supabase
        .from("catalogs")
        .select("*")
        .eq("id", domain.catalog_id)
        .eq("status", "live")
        .maybeSingle();
      catalogRow = (data as CatalogRow | null) ?? null;
    }
  }

  if (!catalogRow) return null;

  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("catalog_id", catalogRow.id)
    .eq("visible", true)
    .order("position", { ascending: true });

  return {
    id: catalogRow.id,
    name: catalogRow.name,
    slug: catalogRow.slug,
    template: catalogRow.template,
    accent: catalogRow.accent,
    currency: catalogRow.currency,
    items: ((items as CatalogItemRow[] | null) ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      category: row.category,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      pack: row.pack,
      image: row.image,
    })),
  };
}

/** Fire-and-forget page view counter for the Admin dashboard's "views" stat. */
export async function recordCatalogView(catalogId: string): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from("catalog_views").insert({ catalog_id: catalogId });
  } catch {
    // Analytics is best-effort — never let a logging failure break the storefront.
  }
}
