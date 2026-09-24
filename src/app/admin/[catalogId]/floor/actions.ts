"use server";

import { revalidatePath } from "next/cache";
import { getCatalogAdminClient, getCatalogOrNotFound } from "@/app/admin/_lib/data";
import {
  isFloorPlanEnabled,
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
  if (!isFloorPlanEnabled(settings)) {
    return { error: "Floor plan is off. Turn it on under Place settings." };
  }
  const floor = publishedFloorPlan(plan);
  const next = { ...settings, floor };
  const supabase = await getCatalogAdminClient();
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
  revalidatePath(`/s/${catalog.slug}/dine`);
  revalidatePath(`/s/${catalog.slug}/reserve`);
  revalidateStorefrontCatalog();
  return { saved: true };
}
