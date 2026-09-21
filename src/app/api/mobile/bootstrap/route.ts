import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import { catalogStatuses } from "../_lib/shape";

/** Everything the app needs right after sign-in: account, catalog, store controls, statuses. */
export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account);
    const statuses = catalogStatuses(catalog);

    return Response.json({
      account: { id: account.id, name: account.name },
      catalog: {
        id: catalog.id,
        name: catalog.name,
        slug: catalog.slug,
        accept_orders: catalog.accept_orders ?? true,
        kitchen_open: catalog.kitchen_open ?? true,
        storefront_alert: catalog.storefront_alert ?? "",
        show_storefront_alert: catalog.show_storefront_alert ?? false,
      },
      statuses,
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
