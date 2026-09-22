import { mobileErrorResponse, requireMobileAccount } from "@/lib/auth/mobile-account";

/** Every store this account can switch between — powers the store-strip switcher. */
export async function GET(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);

    const { data, error } = await supabase
      .from("catalogs")
      .select("id, name, slug")
      .eq("account_id", account.id)
      .order("created_at", { ascending: true });
    if (error) return Response.json({ error: "Could not load your stores." }, { status: 500 });

    return Response.json({ catalogs: data ?? [] });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
