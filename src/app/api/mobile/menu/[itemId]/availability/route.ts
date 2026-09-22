import { mobileErrorResponse, requireMobileAccount, requireMobileCatalog } from "@/lib/auth/mobile-account";

export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const { account, supabase } = await requireMobileAccount(request);
    const catalog = await requireMobileCatalog(supabase, account, request);

    let body: { available?: boolean };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    if (typeof body.available !== "boolean") {
      return Response.json({ error: "available must be true or false." }, { status: 400 });
    }

    const { error } = await supabase
      .from("catalog_items")
      .update({ visible: body.available })
      .eq("id", itemId)
      .eq("catalog_id", catalog.id);
    if (error) return Response.json({ error: "Could not update this item." }, { status: 500 });

    return Response.json({ ok: true, available: body.available });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
