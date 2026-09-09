import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase isn't configured yet. See SETUP.md." }, { status: 500 });
  }

  let body: { email?: string; password?: string; companyName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const password = body.password || "";
  const companyName = (body.companyName || "").trim().slice(0, 120) || "My company";

  if (!email || !password || password.length < 8) {
    return Response.json(
      { error: "Enter a valid email and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (!data.user) {
    return Response.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }

  if (!data.session) {
    // Supabase project has "confirm email" turned on — the user must click
    // the link in their inbox before a session (and account) is created.
    // We provision the account+membership lazily on first successful sign-in
    // instead (see /api/auth/sign-in), since we have no session to attach it
    // to yet.
    return Response.json({ ok: true, needsConfirmation: true });
  }

  const provisioned = await provisionAccount(data.user.id, companyName);
  if (!provisioned) {
    return Response.json(
      { error: "Signed up, but couldn't set up your account. Please try signing in." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, needsConfirmation: false });
}

/**
 * Creates the account + owner membership for a brand-new user. Uses the
 * service-role client since there's no INSERT policy on accounts/
 * account_members — regular app code never creates these except here and in
 * the sign-in fallback below.
 */
export async function provisionAccount(userId: string, companyName: string): Promise<boolean> {
  const service = getServiceClient();

  const { data: existing } = await service
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return true;

  const { data: account, error: accountError } = await service
    .from("accounts")
    .insert({ name: companyName })
    .select("id")
    .single();
  if (accountError || !account) {
    console.error("provisionAccount: failed to create account", accountError);
    return false;
  }

  const { error: memberError } = await service
    .from("account_members")
    .insert({ account_id: account.id, user_id: userId, role: "owner" });
  if (memberError) {
    console.error("provisionAccount: failed to create membership", memberError);
    return false;
  }

  return true;
}
