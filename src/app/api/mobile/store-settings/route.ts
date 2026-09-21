import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import type { CatalogRow } from "@/lib/supabase/types";

export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account);
    return Response.json({
      accept_orders: catalog.accept_orders ?? true,
      kitchen_open: catalog.kitchen_open ?? true,
      storefront_alert: catalog.storefront_alert ?? "",
      show_storefront_alert: catalog.show_storefront_alert ?? false,
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

type StoreSettingsPatch = {
  accept_orders?: boolean;
  kitchen_open?: boolean;
  storefront_alert?: string;
  show_storefront_alert?: boolean;
};

export async function POST(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account);

    let body: StoreSettingsPatch;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    const patch: Partial<CatalogRow> = {};
    if (typeof body.accept_orders === "boolean") patch.accept_orders = body.accept_orders;
    if (typeof body.kitchen_open === "boolean") patch.kitchen_open = body.kitchen_open;
    if (typeof body.storefront_alert === "string") patch.storefront_alert = body.storefront_alert;
    if (typeof body.show_storefront_alert === "boolean") {
      patch.show_storefront_alert = body.show_storefront_alert;
    }
    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { error } = await supabase.from("catalogs").update(patch).eq("id", catalog.id);
    if (error) return Response.json({ error: "Could not update store settings." }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
