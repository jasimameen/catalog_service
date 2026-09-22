import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account, request);

    const { error } = await supabase
      .from("orders")
      .update({ claimed_at: new Date().toISOString(), claimed_by: account.name || account.id })
      .eq("id", orderId)
      .eq("catalog_id", catalog.id)
      .is("claimed_at", null);
    if (error) return Response.json({ error: "Could not take this order." }, { status: 500 });

    return Response.json({ ok: true, claimed_by: account.name || account.id });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
