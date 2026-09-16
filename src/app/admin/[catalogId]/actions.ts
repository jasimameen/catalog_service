"use server";

import { revalidatePath } from "next/cache";
import { revalidateStorefrontCatalog } from "@/lib/catalog/storefront-cache";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { ACCENT_COLORS, isTemplateKey } from "@/lib/catalog/templates";
import { checkoutFieldsFromForm } from "@/lib/catalog/checkout-fields";
import { parseCheckoutForm, parseFulfillmentModes } from "@/lib/catalog/checkout-form";
import { getServiceClient } from "@/lib/supabase/service";
import type { CatalogTemplate } from "@/lib/supabase/types";
import {
  MAX_BANNERS,
  MERCHANDISING_SQL_HINT,
  parseBannersFromForm,
  parseImageFit,
} from "@/lib/catalog/merchandising";

export type LookState = { error?: string; saved?: boolean } | null;

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const LOGO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function logoExt(file: File): string | null {
  if (file.type && LOGO_EXT[file.type]) return LOGO_EXT[file.type]!;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpeg") || name.endsWith(".jpg")) return "jpg";
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".gif")) return "gif";
  return null;
}

async function uploadLogo(
  catalogId: string,
  file: File,
): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_LOGO_BYTES) return { error: "Logo must be 4MB or smaller." };
  const ext = logoExt(file);
  if (!ext) return { error: "Use a JPEG, PNG, WebP, or GIF logo." };

  const path = `${catalogId}/logo-${crypto.randomUUID()}.${ext}`;
  const service = getServiceClient();
  const { error } = await service.storage.from("catalog-images").upload(path, file, {
    contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
    upsert: false,
  });

  if (error) {
    console.error("uploadLogo: upload failed", error);
    return { error: "Could not upload the logo. Try again." };
  }

  const { data } = service.storage.from("catalog-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

function revalidateCatalog(catalogId: string, slug: string) {
  revalidatePath(`/admin/${catalogId}`);
  revalidatePath("/admin");
  revalidatePath(`/s/${slug}`);
  revalidateStorefrontCatalog();
}

export async function updateCatalogLook(
  catalogId: string,
  _prevState: LookState,
  formData: FormData,
): Promise<LookState> {
  await requireAccount();

  const templateRaw = String(formData.get("template") ?? "");
  const template: CatalogTemplate = isTemplateKey(templateRaw) ? templateRaw : "grid";

  const accentRaw = String(formData.get("accent") ?? "").trim();
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentRaw)
    ? accentRaw
    : ACCENT_COLORS[0];

  const checkoutFields = checkoutFieldsFromForm(formData);
  const tagline = String(formData.get("tagline") ?? "").trim().slice(0, 160);
  const about = String(formData.get("about") ?? "").trim().slice(0, 400);
  let logo = String(formData.get("logo") ?? "").trim();
  if (formData.get("clearLogo") === "1") logo = "";

  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    const uploaded = await uploadLogo(catalogId, logoFile);
    if (uploaded.error || !uploaded.url) {
      return { error: uploaded.error ?? "Could not upload the logo." };
    }
    logo = uploaded.url;
  }

  const banners = parseBannersFromForm(formData.get("banners"));
  for (const file of formData.getAll("bannerFiles")) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (banners.length >= MAX_BANNERS) break;
    const uploaded = await uploadLogo(catalogId, file);
    if (uploaded.error || !uploaded.url) {
      return { error: uploaded.error ?? "Could not upload the banner." };
    }
    banners.push({ image: uploaded.url, alt: "" });
  }

  const imageFit = parseImageFit(formData.get("imageFit"));
  const phone = String(formData.get("companyPhone") ?? "").trim().slice(0, 40);
  const address = String(formData.get("companyAddress") ?? "").trim().slice(0, 200);
  const hours = String(formData.get("companyHours") ?? "").trim().slice(0, 200);
  const whatsapp = String(formData.get("companyWhatsapp") ?? "").trim().slice(0, 40);
  const instagram = String(formData.get("companyInstagram") ?? "").trim().slice(0, 80);

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      template,
      accent,
      checkout_fields: checkoutFields,
      logo: logo || null,
      tagline: tagline || null,
      about: about || null,
      banners,
      image_fit: imageFit,
      phone: phone || null,
      address: address || null,
      hours: hours || null,
      whatsapp: whatsapp || null,
      instagram: instagram || null,
    })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCatalogLook failed", error);
    if (
      error?.code === "42703" ||
      error?.code === "PGRST204" ||
      error?.message?.includes("banners") ||
      error?.message?.includes("image_fit") ||
      error?.message?.includes("whatsapp") ||
      error?.message?.includes("instagram")
    ) {
      return { error: MERCHANDISING_SQL_HINT };
    }
    if (
      error?.code === "23514" ||
      error?.message?.includes("logo") ||
      error?.message?.includes("tagline") ||
      error?.message?.includes("about")
    ) {
      return { error: "Run supabase/catalog-branding.sql in the Supabase SQL editor, then try again." };
    }
    return { error: "Could not save look. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export type OrderingState = { error?: string; saved?: boolean } | null;

export async function updateCatalogOrdering(
  catalogId: string,
  _prevState: OrderingState,
  formData: FormData,
): Promise<OrderingState> {
  await requireAccount();

  const fulfillmentModes = parseFulfillmentModes(
    safeJson(formData.get("fulfillment_modes")),
  );
  const checkoutForm = parseCheckoutForm(safeJson(formData.get("checkout_form")));

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      fulfillment_modes: fulfillmentModes,
      checkout_form: checkoutForm,
    })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCatalogOrdering failed", error);
    if (
      error?.code === "42703" ||
      error?.code === "PGRST204" ||
      error?.message?.includes("checkout_form") ||
      error?.message?.includes("fulfillment")
    ) {
      return { error: "Run supabase/restaurant.sql in the Supabase SQL editor, then try again." };
    }
    return { error: "Could not save ordering. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

function safeJson(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
