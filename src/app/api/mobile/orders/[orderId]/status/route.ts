import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";
import { catalogStatuses } from "../../../_lib/shape";
import { nextWorkflowAction } from "@/lib/catalog/order-statuses";

/**
 * Advances (or explicitly sets) an order's status — the mobile equivalent
 * of setOrderStatus() in src/app/admin/[catalogId]/orders/actions.ts. Kept
 * as its own implementation (rather than importing that server action) so
 * the web admin's cookie-coupled auth stays untouched; both go through the
 * same order-statuses.ts rules and the same RLS-guarded `orders` table.
 */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account);
    const statuses = catalogStatuses(catalog);

    let body: { status?: string };
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { data: current, error: fetchError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("catalog_id", catalog.id)
      .maybeSingle();
    if (fetchError || !current) return Response.json({ error: "Order not found." }, { status: 404 });

    const targetStatus = body.status ?? nextWorkflowAction(current.status, statuses)?.nextId;
    if (!targetStatus) return Response.json({ error: "No next status to move to." }, { status: 400 });
    if (!statuses.some((row) => row.id === targetStatus)) {
      return Response.json({ error: "Unknown status." }, { status: 400 });
    }
    if (current.status === targetStatus) return Response.json({ ok: true, status: targetStatus });

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: targetStatus })
      .eq("id", orderId)
      .eq("catalog_id", catalog.id);
    if (updateError) return Response.json({ error: "Could not update status." }, { status: 500 });

    await supabase.from("order_status_events").insert({
      order_id: orderId,
      from_status: current.status,
      to_status: targetStatus,
      actor: "merchant",
    });

    return Response.json({ ok: true, status: targetStatus });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
