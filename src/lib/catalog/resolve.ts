import "server-only";
import { getServiceClient } from "@/lib/supabase/service";
import { subdomainSlugFor } from "@/lib/tenant";
import type { CatalogTemplateKey, StorefrontCatalog } from "./types";
import type { CatalogItemRow, CatalogRow } from "@/lib/supabase/types";
import { parseCheckoutFields } from "./checkout-fields";

const TEMPLATE_KEYS = new Set<CatalogTemplateKey>(["grid", "lookbook", "menu", "pricelist"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hostWithoutPort(host: string): string {
  const cut = host.lastIndexOf(":");
  if (cut > 0 && /^\d+$/.test(host.slice(cut + 1))) return host.slice(0, cut);
  return host;
}

/** `{slug}.localhost` in local browsers when ROOT_DOMAIN is the production apex. */
function localhostDevSlug(hostNoPort: string): string | null {
  if (!hostNoPort.endsWith(".localhost")) return null;
  const slug = hostNoPort.slice(0, -".localhost".length);
  if (!slug || slug.includes(".")) return null;
  return slug;
}

function asTemplate(value: string): CatalogTemplateKey {
  return TEMPLATE_KEYS.has(value as CatalogTemplateKey) ? (value as CatalogTemplateKey) : "grid";
}

async function fetchLiveBySlug(
  supabase: ReturnType<typeof getServiceClient>,
  slug: string,
): Promise<CatalogRow | null> {
  const { data } = await supabase
    .from("catalogs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  return (data as CatalogRow | null) ?? null;
}

async function fetchLiveById(
  supabase: ReturnType<typeof getServiceClient>,
  id: string,
): Promise<CatalogRow | null> {
  const { data } = await supabase
    .from("catalogs")
    .select("*")
    .eq("id", id)
    .eq("status", "live")
    .maybeSingle();
  return (data as CatalogRow | null) ?? null;
}

function toStorefront(catalogRow: CatalogRow, items: CatalogItemRow[] | null): StorefrontCatalog {
  return {
    id: catalogRow.id,
    name: catalogRow.name,
    slug: catalogRow.slug,
    template: asTemplate(catalogRow.template),
    accent: catalogRow.accent,
    currency: catalogRow.currency,
    checkoutFields: parseCheckoutFields(catalogRow.checkout_fields),
    items: (items ?? []).map((row) => ({
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

/**
 * Resolves a Host header (or `/s/[host]` param) to a live catalog + its
 * visible items, using the service-role client (public visitors have no
 * Supabase session, so RLS would otherwise block every read). Returns null
 * if there's no live catalog for that host — the storefront page renders a
 * friendly "not available" screen in that case rather than a raw 404.
 */
export async function resolveCatalogByHost(host: string): Promise<StorefrontCatalog | null> {
  const supabase = getServiceClient();
  const lowerHost = host.toLowerCase().trim();
  const hostNoPort = hostWithoutPort(lowerHost);

  let catalogRow: CatalogRow | null = null;

  const slug = subdomainSlugFor(lowerHost) ?? localhostDevSlug(hostNoPort);
  if (slug) {
    catalogRow = await fetchLiveBySlug(supabase, slug);
  }

  // `/s/acme` or `/s/{uuid}` on the root host — PLAN's catalogId path.
  if (!catalogRow && !hostNoPort.includes(".")) {
    catalogRow = UUID_RE.test(hostNoPort)
      ? await fetchLiveById(supabase, hostNoPort)
      : await fetchLiveBySlug(supabase, hostNoPort);
  }

  if (!catalogRow) {
    const { data: domain } = await supabase
      .from("domains")
      .select("catalog_id")
      .eq("hostname", hostNoPort)
      .eq("status", "verified")
      .maybeSingle();
    if (domain) {
      catalogRow = await fetchLiveById(supabase, domain.catalog_id);
    }
  }

  if (!catalogRow) return null;

  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("catalog_id", catalogRow.id)
    .eq("visible", true)
    .order("position", { ascending: true });

  return toStorefront(catalogRow, (items as CatalogItemRow[] | null) ?? []);
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
