import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";

export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account);

    const includeResolved = new URL(request.url).searchParams.get("all") === "true";
    let query = supabase
      .from("service_requests")
      .select("*")
      .eq("catalog_id", catalog.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!includeResolved) query = query.is("resolved_at", null);

    const { data, error } = await query;
    if (error) return Response.json({ error: "Could not load table requests." }, { status: 500 });

    return Response.json({
      requests: (data ?? []).map((row) => ({
        id: row.id,
        table_no: row.table_no,
        kind: row.kind,
        note: row.note,
        created_at: row.created_at,
        resolved_at: row.resolved_at ?? null,
      })),
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
