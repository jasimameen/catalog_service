import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";

/** Today's reservations for the More screen's compact list — read-only for now. */
export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account, request);

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("reservations")
      .select("id, table_no, slot, guests, name, status")
      .eq("catalog_id", catalog.id)
      .eq("day", today)
      .not("status", "in", "(cancelled,no_show)")
      .order("slot", { ascending: true });
    if (error) return Response.json({ error: "Could not load reservations." }, { status: 500 });

    return Response.json({
      reservations: (data ?? []).map((row) => ({
        id: row.id,
        table_no: row.table_no,
        slot: row.slot,
        guests: row.guests,
        name: row.name,
        status: row.status,
      })),
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
