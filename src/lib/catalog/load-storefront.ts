import { cache } from "react";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveCatalogByHost } from "@/lib/catalog/resolve";
import type { StorefrontCatalog } from "@/lib/catalog/types";

export function decodeStorefrontHost(hostParam: string): string {
  try {
    return decodeURIComponent(hostParam);
  } catch {
    return hostParam;
  }
}

export function storefrontReady(): boolean {
  return isSupabaseConfigured() && hasSupabaseSecretKey();
}

export const loadStorefrontCatalog = cache(async (hostParam: string): Promise<StorefrontCatalog | null> => {
  if (!storefrontReady()) return null;
  try {
    return await resolveCatalogByHost(decodeStorefrontHost(hostParam));
  } catch (error) {
    console.error("Storefront: failed to load catalog", error);
    return null;
  }
});
