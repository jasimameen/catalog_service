import "server-only";
import { buildHarborKitchenCatalog, HARBOR_DEMO_SLUG } from "./demo-harbor";
import { resolveCatalogByHost } from "./resolve";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import type { StorefrontCatalog } from "./types";

export async function loadHarborDemoCatalog(): Promise<{
  catalog: StorefrontCatalog;
  fromDb: boolean;
}> {
  if (isSupabaseConfigured() && hasSupabaseSecretKey()) {
    try {
      const live = await resolveCatalogByHost(HARBOR_DEMO_SLUG);
      if (live) return { catalog: live, fromDb: true };
    } catch (error) {
      console.error("Harbor demo: catalog lookup failed", error);
    }
  }
  return { catalog: buildHarborKitchenCatalog(), fromDb: false };
}
