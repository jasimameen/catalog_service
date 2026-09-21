import { mobileErrorResponse, requireMobileAccount } from "@/lib/auth/mobile-account";

/**
 * Registers (or refreshes) this device's FCM token so the server can push
 * to it when a new order or table request comes in. Safe to call on every
 * app start — it upserts on the token itself (unique), so a token that
 * moved to a different account just gets re-owned.
 */
export async function POST(request: Request) {
  try {
    const { account, supabase } = await requireMobileAccount(request);

    let body: { token?: string; platform?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    if (!body.token || (body.platform !== "ios" && body.platform !== "android")) {
      return Response.json({ error: "token and platform ('ios' | 'android') are required." }, { status: 400 });
    }

    const { error } = await supabase.from("mobile_push_tokens").upsert(
      {
        account_id: account.id,
        token: body.token,
        platform: body.platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) return Response.json({ error: "Could not register this device." }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireMobileAccount(request);
    let body: { token?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    if (!body.token) return Response.json({ error: "token is required." }, { status: 400 });

    await supabase.from("mobile_push_tokens").delete().eq("token", body.token);
    return Response.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
