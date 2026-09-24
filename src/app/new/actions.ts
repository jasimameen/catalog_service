"use server";

import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { countAccountCatalogs } from "@/lib/billing/account-access";
import { canPublishNewCatalog, catalogLimit, hasActiveAccess } from "@/lib/billing/status";
import { getServerSupabase } from "@/lib/supabase/server";
import { isValidSlug, normalizeSlug } from "@/lib/catalog/slug";
import { revalidateStorefrontCatalog } from "@/lib/catalog/storefront-cache";
import { isTemplateKey, parseAccentHex } from "@/lib/catalog/templates";
import type { CatalogTemplate } from "@/lib/supabase/types";

export interface PublishDraftItem {
  name: string;
  price: number;
  /** "" (no photo), a pasted URL, or a small data: URL — see BuilderClient's
   *  photo-handling comment for the size cap enforced before this is called. */
  image: string;
}

export interface PublishInput {
  name: string;
  template: CatalogTemplate;
  accent: string;
  slug: string;
  orderEmail: string;
  items?: PublishDraftItem[];
}

export type PublishResult =
  | { ok: true; catalogId: string; slug: string }
  | { ok: false; error: string; field?: "slug" };


/**
 * Publishes the draft built in the wizard: inserts the `catalogs` row, then
 * bulk-inserts any `catalog_items` if the client sent some. Items are
 * optional — merchants upload a spreadsheet after the catalog exists.
 * Runs as a Server Action so errors (in particular a slug uniqueness race
 * with the availability check in src/app/new/api/check-slug) come back as
 * a typed result the client can show inline, instead of a thrown exception.
 *
 * Every value that determines *ownership* (the account_id) is derived from
 * the session here via requireAccount(), never taken from the client input —
 * see the Server Actions security notes in
 * node_modules/next/dist/docs/01-app/02-guides/server-actions.md ("a
 * well-formed object can still refer to a row the caller does not own").
 */

export async function publishCatalog(input: PublishInput): Promise<PublishResult> {
  const account = await requireAccount({ next: "/new" });
  const user = await getSessionUser();
  const catalogCount = await countAccountCatalogs(account.id);

  if (!canPublishNewCatalog(account, { email: user?.email, catalogCount })) {
    if (!hasActiveAccess(account, user?.email)) {
      return {
        ok: false,
        error: "Subscribe to publish a new catalog. The public shop is paused until you do.",
      };
    }
    const limit = catalogLimit(account, user?.email);
    return {
      ok: false,
      error:
        limit != null
          ? `This plan includes ${limit} ${limit === 1 ? "catalog" : "catalogs"}.`
          : "Could not publish another catalog on this plan.",
    };
  }

  const name = input.name.trim().slice(0, 120) || `${account.name}'s catalog`;
  const slug = normalizeSlug(input.slug);
  if (!slug || !isValidSlug(slug)) {
    return {
      ok: false,
      error: "Pick an address using lowercase letters, numbers and dashes.",
      field: "slug",
    };
  }

  const items = (input.items ?? [])
    .map((it) => ({
      name: it.name.trim().slice(0, 200),
      price: Number.isFinite(it.price) ? Math.max(0, Math.round(it.price * 100) / 100) : 0,
      image: (it.image || "").trim(),
    }))
    .filter((it) => it.name.length > 0);

  const accent = parseAccentHex(input.accent) ?? "#0b5fce";
  const orderEmail = input.orderEmail.trim() || null;
  const template: CatalogTemplate = isTemplateKey(input.template) ? input.template : "grid";

  const supabase = await getServerSupabase();

  const { data: catalog, error: catalogError } = await supabase
    .from("catalogs")
    .insert({
      account_id: account.id,
      name,
      slug,
      status: "live",
      template,
      accent,
      currency: account.currency,
      order_email: orderEmail,
    })
    .select("id, slug")
    .single();

  if (catalogError || !catalog) {
    // 23505 = Postgres unique_violation — the slug (unique across ALL
    // catalogs) was taken between the availability check and this submit.
    if (catalogError?.code === "23505") {
      return { ok: false, error: "This address was just taken — pick a suggestion or try another.", field: "slug" };
    }
    console.error("publishCatalog: catalog insert failed", catalogError);
    return { ok: false, error: "Couldn't publish your catalog. Please try again." };
  }

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      catalog_id: catalog.id,
      code: `ITEM-${index + 1}`,
      category: "",
      name: it.name,
      description: "",
      price: it.price,
      pack: "",
      image: it.image,
      position: index,
      visible: true,
    }));

    const { error: itemsError } = await supabase.from("catalog_items").insert(rows);

    if (itemsError) {
      // Best-effort rollback so a failed items insert doesn't leave a
      // half-created catalog. Empty catalogs are valid; a failed *write*
      // of supplied items is not. Supabase-js has no cross-table transaction.
      console.error("publishCatalog: item insert failed, rolling back catalog", itemsError);
      await supabase.from("catalogs").delete().eq("id", catalog.id);
      return { ok: false, error: "Couldn't save your items. Please try again." };
    }
  }

  revalidateStorefrontCatalog();
  return { ok: true, catalogId: catalog.id, slug: catalog.slug };
}
