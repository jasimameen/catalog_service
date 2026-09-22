import { getSessionAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Registers (or refreshes) this browser's FCM web token on the same
 * mobile_push_tokens table the Instant Catalog Ops app uses.
 */
export async function POST(request: Request) {
  const account = await getSessionAccount();
  if (!account) return Response.json({ error: "Sign in to enable alerts." }, { status: 401 });

  let body: { token?: string; platform?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.token || body.platform !== "web") {
    return Response.json({ error: "token and platform ('web') are required." }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("mobile_push_tokens").upsert(
    {
      account_id: account.id,
      token: body.token,
      platform: "web",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) return Response.json({ error: "Could not register this device." }, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const account = await getSessionAccount();
  if (!account) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.token) return Response.json({ error: "token is required." }, { status: 400 });

  const supabase = await getServerSupabase();
  await supabase.from("mobile_push_tokens").delete().eq("token", body.token).eq("account_id", account.id);
  return Response.json({ ok: true });
}
