import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account, request);

    const { error } = await supabase
      .from("service_requests")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("catalog_id", catalog.id);
    if (error) return Response.json({ error: "Could not dismiss this request." }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
