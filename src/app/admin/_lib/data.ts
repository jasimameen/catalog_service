import { cache } from "react";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { CatalogRow } from "@/lib/supabase/types";

/**
 * Loads a catalog by id, scoped by RLS to the signed-in account. If the
 * catalog doesn't exist or belongs to another account, RLS returns no rows
 * — treated the same as a real 404. Wrapped in React's `cache()` so the
 * `[catalogId]` layout and the page that renders inside it share one query
 * per request instead of two.
 */
export const getCatalogOrNotFound = cache(async (catalogId: string): Promise<CatalogRow> => {
  const supabase = await getServerSupabase();
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
