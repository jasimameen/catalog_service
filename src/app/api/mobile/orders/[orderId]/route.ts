import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import { catalogStatuses, shapeOrder } from "../../_lib/shape";
import type { OrderItemRow, OrderRow, OrderStatusEventRow } from "@/lib/supabase/types";

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account);
    const statuses = catalogStatuses(catalog);

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("catalog_id", catalog.id)
      .maybeSingle();
    if (error || !order) return Response.json({ error: "Order not found." }, { status: 404 });

    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    const { data: events } = await supabase
      .from("order_status_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    return Response.json({
      order: shapeOrder(order as OrderRow, (items ?? []) as OrderItemRow[], statuses),
      timeline: (events ?? []) as OrderStatusEventRow[],
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
