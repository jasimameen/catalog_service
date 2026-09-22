import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import { catalogStatuses } from "../../../_lib/shape";

const CANCEL_STATUS_ID = "cancelled";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account, request);
    const statuses = catalogStatuses(catalog);

    if (!statuses.some((row) => row.id === CANCEL_STATUS_ID)) {
      return Response.json(
        { error: "This catalog's order statuses don't include Cancelled. Add one on the web dashboard." },
        { status: 400 },
      );
    }

    const { data: current } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("catalog_id", catalog.id)
      .maybeSingle();
    if (!current) return Response.json({ error: "Order not found." }, { status: 404 });

    const { error } = await supabase
      .from("orders")
      .update({ status: CANCEL_STATUS_ID })
      .eq("id", orderId)
      .eq("catalog_id", catalog.id);
    if (error) return Response.json({ error: "Could not cancel this order." }, { status: 500 });

    await supabase.from("order_status_events").insert({
      order_id: orderId,
      from_status: current.status,
      to_status: CANCEL_STATUS_ID,
      actor: "merchant",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
