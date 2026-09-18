"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import {
  parseTemplateSettings,
  publishedFloorPlan,
  TEMPLATE_SETTINGS_SQL_HINT,
} from "@/lib/catalog/template-settings";
import { revalidateStorefrontCatalog } from "@/lib/catalog/storefront-cache";

export async function saveFloorPlan(
  catalogId: string,
  plan: unknown,
): Promise<{ error?: string; saved?: boolean }> {
  const catalog = await getCatalogOrNotFound(catalogId);
  const settings = parseTemplateSettings(catalog.template_settings);
  const floor = publishedFloorPlan(plan);
  const next = { ...settings, floor };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("catalogs")
    .update({ template_settings: next })
    .eq("id", catalogId);
  if (error) {
    if (error.code === "42703" || error.message.includes("template_settings")) {
      return { error: TEMPLATE_SETTINGS_SQL_HINT };
    }
    return { error: "Could not publish the floor plan." };
  }
  revalidatePath(`/admin/${catalogId}`);
  revalidatePath(`/admin/${catalogId}/floor`);
  revalidatePath(`/s/${catalog.slug}`);
  revalidatePath(`/s/${catalog.slug}/reserve`);
  revalidateStorefrontCatalog();
  return { saved: true };
}
