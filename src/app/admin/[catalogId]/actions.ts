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
  STOREFRONT_SETTINGS_SQL_HINT,
  parseBannersFromForm,
  parseImageFit,
} from "@/lib/catalog/merchandising";
import { parseCoord, parseLocationsFromText } from "@/lib/catalog/locations";
import { STOCK_PHOTOS } from "@/lib/catalog/placeholders";

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
  const email = String(formData.get("companyEmail") ?? "").trim().slice(0, 120);
  const address = String(formData.get("companyAddress") ?? "").trim().slice(0, 200);
  const hours = String(formData.get("companyHours") ?? "").trim().slice(0, 800);
  const whatsapp = String(formData.get("companyWhatsapp") ?? "").trim().slice(0, 40);
  const instagram = String(formData.get("companyInstagram") ?? "").trim().slice(0, 80);
  const locations = parseLocationsFromText(String(formData.get("companyLocations") ?? ""));
  const geoLat = parseCoord(formData.get("companyLat"));
  const geoLng = parseCoord(formData.get("companyLng"));
  const placeholderRaw = String(formData.get("placeholderImageUrl") ?? "").trim();
  const placeholderImageUrl = STOCK_PHOTOS.some((photo) => photo.url === placeholderRaw)
    ? placeholderRaw
    : "";
  const showHours = formData.get("showHours") === "1";
  const showContact = formData.get("showContact") === "1";
  const showSocial = formData.get("showSocial") === "1";
  const showMap = formData.get("showMap") === "1";

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
      email: email || null,
      address: address || null,
      hours: hours || null,
      whatsapp: whatsapp || null,
      instagram: instagram || null,
      locations,
      geo_lat: geoLat,
      geo_lng: geoLng,
      placeholder_image_url: placeholderImageUrl || null,
      show_hours: showHours,
      show_contact: showContact,
      show_social: showSocial,
      show_map: showMap,
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
      error?.message?.includes("accept_orders") ||
      error?.message?.includes("show_map") ||
      error?.message?.includes("show_hours") ||
      error?.message?.includes("locations") ||
      error?.message?.includes("geo_lat") ||
      error?.message?.includes("placeholder") ||
      error?.message?.includes("email")
    ) {
      return { error: STOREFRONT_SETTINGS_SQL_HINT };
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
  const acceptOrders = formData.get("acceptOrders") === "1";
  const ordersPausedMessage =
    typeof formData.get("ordersPausedMessage") === "string"
      ? String(formData.get("ordersPausedMessage")).trim().slice(0, 280)
      : "";
  const storefrontAlert =
    typeof formData.get("storefrontAlert") === "string"
      ? String(formData.get("storefrontAlert")).trim().slice(0, 280)
      : "";
  const showStorefrontAlert = formData.get("showStorefrontAlert") === "1";

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      fulfillment_modes: fulfillmentModes,
      checkout_form: checkoutForm,
      accept_orders: acceptOrders,
      orders_paused_message: ordersPausedMessage || null,
      storefront_alert: storefrontAlert || null,
      show_storefront_alert: showStorefrontAlert,
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
    if (
      error?.message?.includes("accept_orders") ||
      error?.message?.includes("orders_paused_message") ||
      error?.message?.includes("storefront_alert")
    ) {
      return {
        error:
          error.message.includes("orders_paused") || error.message.includes("storefront_alert")
            ? "Run supabase/order-status-history.sql in the Supabase SQL editor, then try again."
            : STOREFRONT_SETTINGS_SQL_HINT,
      };
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
