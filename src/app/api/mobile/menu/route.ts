import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import type { CatalogItemRow } from "@/lib/supabase/types";

export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account);

    const { data, error } = await supabase
      .from("catalog_items")
      .select("id, name, code, category, visible, position")
      .eq("catalog_id", catalog.id)
      .order("category", { ascending: true })
      .order("position", { ascending: true });
    if (error) return Response.json({ error: "Could not load the menu." }, { status: 500 });

    const items = (data ?? []) as Pick<
      CatalogItemRow,
      "id" | "name" | "code" | "category" | "visible" | "position"
    >[];

    return Response.json({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category || "Other",
        // "Available" in the app == "Visible" on the storefront — there is
        // no separate day-of-stock flag, so 86'ing an item here hides it
        // from checkout exactly like the web admin's Visible toggle does.
        available: item.visible,
      })),
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
