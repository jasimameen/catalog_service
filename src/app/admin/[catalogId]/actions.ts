"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { ACCENT_COLORS, TEMPLATES } from "@/lib/catalog/templates";
import { checkoutFieldsFromForm } from "@/lib/catalog/checkout-fields";
import type { CatalogTemplate } from "@/lib/supabase/types";

export type LookState = { error?: string; saved?: boolean } | null;

const TEMPLATE_KEYS = new Set<CatalogTemplate>(TEMPLATES.map((t) => t.key));

function revalidateCatalog(catalogId: string, slug: string) {
  revalidatePath(`/admin/${catalogId}`);
  revalidatePath("/admin");
  revalidatePath(`/s/${slug}`);
}

export async function updateCatalogLook(
  catalogId: string,
  _prevState: LookState,
  formData: FormData,
): Promise<LookState> {
  await requireAccount();

  const templateRaw = String(formData.get("template") ?? "");
  const template: CatalogTemplate = TEMPLATE_KEYS.has(templateRaw as CatalogTemplate)
    ? (templateRaw as CatalogTemplate)
    : "grid";

  const accentRaw = String(formData.get("accent") ?? "").trim();
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentRaw)
    ? accentRaw
    : ACCENT_COLORS[0];

  const checkoutFields = checkoutFieldsFromForm(formData);

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      template,
      accent,
      checkout_fields: checkoutFields,
    })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    return { error: "Could not save look. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}
