import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import { catalogStatuses, shapeOrder } from "../_lib/shape";
import type { OrderItemRow, OrderRow } from "@/lib/supabase/types";

/** Recent tickets for the board/list — newest first, capped so a busy day doesn't send everything ever. */
export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account, request);
    const statuses = catalogStatuses(catalog);

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("catalog_id", catalog.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return Response.json({ error: "Could not load orders." }, { status: 500 });

    const orderRows = (orders ?? []) as OrderRow[];
    const orderIds = orderRows.map((row) => row.id);

    let itemsByOrder = new Map<string, OrderItemRow[]>();
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      itemsByOrder = new Map();
      for (const item of (items ?? []) as OrderItemRow[]) {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      }
    }

    const shaped = orderRows.map((row) => shapeOrder(row, itemsByOrder.get(row.id) ?? [], statuses));
    return Response.json({ orders: shaped, statuses });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
