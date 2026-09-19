import { cache } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/current-account";
import { canOperatePlatform } from "@/lib/auth/platform";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import type { CatalogRow } from "@/lib/supabase/types";

/**
 * Catalog-scoped admin client. Merchants stay on RLS (own account only).
 * Platform operators use the service role so they can open any catalog
 * after listing it on /admin/ops — writes still go through server actions.
 */
export async function getCatalogAdminClient() {
  const user = await getSessionUser();
  if (canOperatePlatform(user?.email)) {
    return getServiceClient();
  }
  return getServerSupabase();
}

/**
 * Loads a catalog by id. Merchants: RLS 404s other accounts. Operators:
 * service-role read so concierge can open a shop they are setting up.
 */
export const getCatalogOrNotFound = cache(async (catalogId: string): Promise<CatalogRow> => {
  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalogs")
    .select("*")
    .eq("id", catalogId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  return data as CatalogRow;
});
