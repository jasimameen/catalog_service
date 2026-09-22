import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import type { CatalogItemRow, ItemOptionGroup } from "@/lib/supabase/types";

function parseOptionGroups(value: unknown): ItemOptionGroup[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is ItemOptionGroup =>
      Boolean(row) && typeof row === "object" && typeof (row as ItemOptionGroup).name === "string",
  );
}

export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account, request);

    const { data, error } = await supabase
      .from("catalog_items")
      .select("id, name, code, category, visible, position, image, price, options")
      .eq("catalog_id", catalog.id)
      .order("category", { ascending: true })
      .order("position", { ascending: true });
    if (error) return Response.json({ error: "Could not load the menu." }, { status: 500 });

    const items = (data ?? []) as Pick<
      CatalogItemRow,
      "id" | "name" | "code" | "category" | "visible" | "position" | "image" | "price" | "options"
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
        image: item.image || null,
        price: item.price,
        // Variant groups (size, milk, etc.) — read-only here, same as the
        // rest of this app; edited on the web dashboard.
        options: parseOptionGroups(item.options).map((group) => ({
          name: group.name,
          values: group.values.map((v) => v.name),
        })),
      })),
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
