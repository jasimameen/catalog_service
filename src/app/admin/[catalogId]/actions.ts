"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateStorefrontCatalog } from "@/lib/catalog/storefront-cache";
import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { countAccountCatalogs } from "@/lib/billing/account-access";
import { getCatalogAdminClient } from "@/app/admin/_lib/data";
import { ACCENT_COLORS, isTemplateKey, parseAccentHex } from "@/lib/catalog/templates";
import { checkoutFieldsFromForm } from "@/lib/catalog/checkout-fields";
import { parseCheckoutForm, parseFulfillmentModes } from "@/lib/catalog/checkout-form";
import {
  parseTemplateSettings,
  parseTemplateSettingsFromForm,
  TEMPLATE_SETTINGS_SQL_HINT,
  type TemplateSettings,
} from "@/lib/catalog/template-settings";
import { getServiceClient } from "@/lib/supabase/service";
import type { CatalogTemplate } from "@/lib/supabase/types";
import {
  MAX_BANNERS,
  MERCHANDISING_SQL_HINT,
  STOREFRONT_SETTINGS_SQL_HINT,
  parseBannersFromForm,
  parseImageFit,
} from "@/lib/catalog/merchandising";
import { parseCoord, parseLocations } from "@/lib/catalog/locations";
import { formatCatalogHours, parseHoursState } from "@/lib/catalog/hours";
import { canPublishNewCatalog } from "@/lib/billing/status";
import { isValidSlug, slugFromName, suggestSlugCandidates } from "@/lib/catalog/slug";
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
  revalidatePath(`/admin/${catalogId}/floor`);
  revalidatePath("/admin");
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/dine`);
  revalidatePath(`/s/${slug}/reserve`);
  revalidateStorefrontCatalog();
}

/** Look and ordering forms send the whole blob; floor is owned by Place / the studio. */
function withPreservedFloor(incoming: TemplateSettings, current: unknown): TemplateSettings {
  const existing = parseTemplateSettings(current);
  return {
    ...incoming,
    printTicketHtml: incoming.printTicketHtml.trim() ? incoming.printTicketHtml : existing.printTicketHtml,
    floor: existing.floor,
    restaurant: {
      ...incoming.restaurant,
      enableFloor: existing.restaurant.enableFloor,
    },
  };
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
  const accent = parseAccentHex(accentRaw) ?? ACCENT_COLORS[0]!;

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
  const placeholderRaw = String(formData.get("placeholderImageUrl") ?? "").trim();
  const placeholderImageUrl = STOCK_PHOTOS.some((photo) => photo.url === placeholderRaw)
    ? placeholderRaw
    : "";
  const supabase = await getCatalogAdminClient();
  const current = await supabase.from("catalogs").select("template_settings").eq("id", catalogId).maybeSingle();
  const templateSettings = withPreservedFloor(
    parseTemplateSettingsFromForm(formData.get("template_settings")),
    current.data?.template_settings,
  );

  const { data, error } = await supabase
    .from("catalogs")
    .update({
      template,
      template_settings: templateSettings,
      accent,
      logo: logo || null,
      banners,
      image_fit: imageFit,
      placeholder_image_url: placeholderImageUrl || null,
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
    if (error?.message?.includes("template_settings") || error?.code === "PGRST204") {
      return { error: TEMPLATE_SETTINGS_SQL_HINT };
    }
    return { error: "Could not save look. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export type DiscoveryState = { error?: string; saved?: boolean } | null;

export async function updateCatalogDiscovery(
  catalogId: string,
  _prevState: DiscoveryState,
  formData: FormData,
): Promise<DiscoveryState> {
  await requireAccount();
  const tagline = String(formData.get("tagline") ?? "").trim().slice(0, 160);
  const about = String(formData.get("about") ?? "").trim().slice(0, 400);

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      tagline: tagline || null,
      about: about || null,
    })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCatalogDiscovery failed", error);
    return { error: "Could not save discovery. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export type PlaceState = { error?: string; saved?: boolean } | null;

export async function updateCatalogPlace(
  catalogId: string,
  _prevState: PlaceState,
  formData: FormData,
): Promise<PlaceState> {
  await requireAccount();
  const phone = String(formData.get("companyPhone") ?? "").trim().slice(0, 40);
  const email = String(formData.get("companyEmail") ?? "").trim().slice(0, 120);
  const address = String(formData.get("companyAddress") ?? "").trim().slice(0, 200);
  const whatsapp = String(formData.get("companyWhatsapp") ?? "").trim().slice(0, 40);
  const instagram = String(formData.get("companyInstagram") ?? "").trim().slice(0, 80);
  const geoLat = parseCoord(formData.get("companyLat"));
  const geoLng = parseCoord(formData.get("companyLng"));
  const showContact = formData.get("showContact") === "1";
  const showSocial = formData.get("showSocial") === "1";
  const showMap = formData.get("showMap") === "1";

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      phone: phone || null,
      email: email || null,
      address: address || null,
      whatsapp: whatsapp || null,
      instagram: instagram || null,
      geo_lat: geoLat,
      geo_lng: geoLng,
      show_contact: showContact,
      show_social: showSocial,
      show_map: showMap,
    })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCatalogPlace failed", error);
    if (
      error?.message?.includes("show_map") ||
      error?.message?.includes("geo_lat") ||
      error?.message?.includes("email")
    ) {
      return { error: STOREFRONT_SETTINGS_SQL_HINT };
    }
    return { error: "Could not save place details. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export async function updateCatalogLocations(
  catalogId: string,
  raw: unknown,
): Promise<{ error?: string; saved?: boolean }> {
  await requireAccount();
  const locations = parseLocations(raw);

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalogs")
    .update({ locations })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCatalogLocations failed", error);
    if (error?.message?.includes("locations")) {
      return { error: STOREFRONT_SETTINGS_SQL_HINT };
    }
    return { error: "Could not save locations. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export async function catalogNavLabel(catalogId: string): Promise<string | null> {
  const meta = await catalogNavMeta(catalogId);
  return meta?.name ?? null;
}

export async function catalogNavMeta(
  catalogId: string,
): Promise<{ name: string | null; enableFloor: boolean } | null> {
  await requireAccount();
  const supabase = await getCatalogAdminClient();
  const { data } = await supabase
    .from("catalogs")
    .select("name, template_settings")
    .eq("id", catalogId)
    .maybeSingle();
  if (!data) return null;
  const settings = parseTemplateSettings(data.template_settings);
  return {
    name: typeof data.name === "string" && data.name.trim() ? data.name : null,
    enableFloor: settings.restaurant.enableFloor,
  };
}

export async function setCatalogFloorPlan(
  catalogId: string,
  enableFloor: boolean,
): Promise<{ error?: string; saved?: boolean }> {
  await requireAccount();
  const supabase = await getCatalogAdminClient();
  const { data: current } = await supabase
    .from("catalogs")
    .select("slug, template_settings")
    .eq("id", catalogId)
    .maybeSingle();
  if (!current) return { error: "Catalog not found." };

  const settings = parseTemplateSettings(current.template_settings);
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      template_settings: {
        ...settings,
        restaurant: { ...settings.restaurant, enableFloor },
      },
    })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("setCatalogFloorPlan failed", error);
    if (error?.message?.includes("template_settings") || error?.code === "PGRST204") {
      return { error: TEMPLATE_SETTINGS_SQL_HINT };
    }
    return { error: "Could not save floor plan." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export async function catalogIncomingMeta(
  catalogId: string,
): Promise<{ currency: string; notify: ReturnType<typeof parseTemplateSettings>["notify"] } | null> {
  await requireAccount();
  const supabase = await getCatalogAdminClient();
  const { data } = await supabase
    .from("catalogs")
    .select("currency, template_settings")
    .eq("id", catalogId)
    .maybeSingle();
  if (!data) return null;
  return {
    currency: typeof data.currency === "string" && data.currency.trim() ? data.currency : "AED",
    notify: parseTemplateSettings(data.template_settings).notify,
  };
}

export async function deleteCatalog(
  catalogId: string,
  typedName: string,
): Promise<{ error?: string }> {
  await requireAccount();
  const supabase = await getCatalogAdminClient();
  const { data: catalog } = await supabase
    .from("catalogs")
    .select("id, name, slug")
    .eq("id", catalogId)
    .maybeSingle();

  if (!catalog) return { error: "Catalog not found." };
  if (typedName.trim().toLowerCase() !== catalog.name.trim().toLowerCase()) {
    return { error: `Type ${catalog.name} to confirm.` };
  }

  const { error } = await supabase.from("catalogs").delete().eq("id", catalogId);
  if (error) {
    console.error("deleteCatalog failed", error);
    return { error: "Could not delete this catalog. Try again." };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/${catalogId}`);
  revalidatePath(`/s/${catalog.slug}`);
  revalidateStorefrontCatalog();
  redirect("/admin");
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
  const checkoutFields = checkoutFieldsFromForm(formData);
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
  const orderEmail = String(formData.get("order_email") ?? "").trim().slice(0, 120);
  if (orderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderEmail)) {
    return { error: "Enter a valid order email." };
  }
  const incomingSettings = formData.get("template_settings");

  const supabase = await getCatalogAdminClient();
  const current = await supabase.from("catalogs").select("template_settings").eq("id", catalogId).maybeSingle();
  const merged = parseTemplateSettings(current.data?.template_settings);
  const nextSettings = incomingSettings
    ? withPreservedFloor(parseTemplateSettingsFromForm(incomingSettings), merged)
    : merged;

  const { data, error } = await supabase
    .from("catalogs")
    .update({
      fulfillment_modes: fulfillmentModes,
      checkout_form: checkoutForm,
      checkout_fields: checkoutFields,
      accept_orders: acceptOrders,
      orders_paused_message: ordersPausedMessage || null,
      storefront_alert: storefrontAlert || null,
      show_storefront_alert: showStorefrontAlert,
      order_email: orderEmail || null,
      template_settings: nextSettings,
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

export async function setDayService(
  catalogId: string,
  patch: { acceptOrders?: boolean; kitchenOpen?: boolean },
): Promise<{ error?: string; saved?: boolean }> {
  await requireAccount();
  const supabase = await getCatalogAdminClient();
  const { data: current } = await supabase
    .from("catalogs")
    .select("slug, template_settings")
    .eq("id", catalogId)
    .maybeSingle();
  if (!current) return { error: "Catalog not found." };

  const next: {
    accept_orders?: boolean;
    template_settings?: ReturnType<typeof parseTemplateSettings>;
  } = {};
  if (patch.acceptOrders !== undefined) next.accept_orders = patch.acceptOrders;
  if (patch.kitchenOpen !== undefined) {
    const settings = parseTemplateSettings(current.template_settings);
    next.template_settings = {
      ...settings,
      restaurant: { ...settings.restaurant, kitchenOpen: patch.kitchenOpen },
    };
  }
  if (next.accept_orders === undefined && next.template_settings === undefined) return { saved: true };

  const { data, error } = await supabase
    .from("catalogs")
    .update(next)
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("setDayService failed", error);
    return { error: "Could not update service. Try again." };
  }
  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export type HoursState = { error?: string; saved?: boolean } | null;

export async function updateCatalogHours(
  catalogId: string,
  _prevState: HoursState,
  formData: FormData,
): Promise<HoursState> {
  await requireAccount();
  const hours = formatCatalogHours(parseHoursState(formData.get("hoursJson")));
  const showHours = formData.get("showHours") === "1";

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalogs")
    .update({
      hours: hours || null,
      show_hours: showHours,
    })
    .eq("id", catalogId)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("updateCatalogHours failed", error);
    return { error: "Could not save hours. Try again." };
  }

  revalidateCatalog(catalogId, data.slug);
  return { saved: true };
}

export async function createBranchCatalog(
  sourceCatalogId: string,
  input: { name: string; copyHours: boolean },
): Promise<{ error?: string; catalogId?: string; slug?: string }> {
  const account = await requireAccount();
  const name = input.name.trim().slice(0, 120);
  if (!name) return { error: "Give the branch a name." };

  const supabase = await getCatalogAdminClient();
  const { data: source, error: sourceError } = await supabase
    .from("catalogs")
    .select(
      "id, account_id, template, accent, currency, hours, order_email, fulfillment_modes, checkout_form, checkout_fields, template_settings, show_hours",
    )
    .eq("id", sourceCatalogId)
    .maybeSingle();

  if (sourceError || !source) {
    return { error: "Could not find this shop." };
  }

  const user = await getSessionUser();
  const ownerFull = await supabase
    .from("accounts")
    .select("ls_status, trial_ends_at, comp, max_catalogs")
    .eq("id", source.account_id)
    .maybeSingle();
  const owner = ownerFull.error
    ? await supabase
        .from("accounts")
        .select("ls_status, trial_ends_at")
        .eq("id", source.account_id)
        .maybeSingle()
    : ownerFull;
  const ownerBilling = owner.data ?? account;
  const catalogCount = await countAccountCatalogs(source.account_id);

  if (!canPublishNewCatalog(ownerBilling, { email: user?.email, catalogCount })) {
    return { error: "Subscribe to add another shop, or ask us to raise the catalog limit." };
  }

  const slug = await uniqueBranchSlug(name);
  if (!slug) return { error: "Could not pick a shop address. Try another name." };

  const { data: catalog, error: insertError } = await supabase
    .from("catalogs")
    .insert({
      account_id: source.account_id,
      name,
      slug,
      status: "live",
      template: source.template,
      accent: source.accent,
      currency: source.currency,
      hours: input.copyHours ? source.hours : null,
      order_email: source.order_email,
      fulfillment_modes: source.fulfillment_modes,
      checkout_form: source.checkout_form,
      checkout_fields: source.checkout_fields,
      template_settings: source.template_settings,
      show_hours: source.show_hours,
    })
    .select("id, slug")
    .maybeSingle();

  if (insertError || !catalog) {
    if (insertError?.code === "23505") {
      return { error: "That shop address was just taken. Try a slightly different name." };
    }
    console.error("createBranchCatalog failed", insertError);
    return { error: "Could not add that branch. Try again." };
  }

  revalidateCatalog(catalog.id, catalog.slug);
  revalidatePath(`/admin/${sourceCatalogId}`);
  return { catalogId: catalog.id, slug: catalog.slug };
}

async function uniqueBranchSlug(name: string): Promise<string | null> {
  const base = slugFromName(name) || "shop";
  const extras = `${base}-${Date.now().toString(36).slice(-4)}`;
  const candidates = [base, ...suggestSlugCandidates(base, name), extras].filter(
    (value): value is string => Boolean(value) && isValidSlug(value),
  );
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("catalogs").select("slug").in("slug", candidates);
  if (error) {
    console.error("uniqueBranchSlug failed", error);
    return candidates[0] ?? null;
  }
  const used = new Set((data ?? []).map((row) => row.slug));
  return candidates.find((value) => !used.has(value)) ?? null;
}

function safeJson(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
