import { sendWelcomeEmail } from "@/lib/auth/welcome-mail";
import { companyNameFromUser, provisionAccount, safeNextPath } from "@/lib/auth/provision";
import { verifyEmailOtpChallenge } from "@/lib/auth/email-otp";
import { isEmailAddress } from "@/lib/auth/find-user";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Supabase isn't configured yet. See SETUP.md." }, { status: 500 });
  }

  let body: { email?: string; code?: string; password?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const code = body.code || "";
  const password = body.password || "";

  if (!email || !isEmailAddress(email)) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const verified = await verifyEmailOtpChallenge({ email, code, password: password || undefined });
  if (!verified.ok) {
    return Response.json({ error: verified.error }, { status: 400 });
  }

  const provisioned = await provisionAccount(verified.user.id, companyNameFromUser(verified.user));
  if (!provisioned) {
    return Response.json(
      {
        error:
          "Code accepted, but your account could not be set up. Add SUPABASE_SECRET_KEY to .env.local (see SETUP.md).",
      },
      { status: 500 },
    );
  }

  await sendWelcomeEmail(email, companyNameFromUser(verified.user));

  const requested = safeNextPath(body.next, "");
  if (requested) {
    return Response.json({ ok: true, next: requested });
  }

  const supabase = await getServerSupabase();
  const { count } = await supabase.from("catalogs").select("id", { count: "exact", head: true });
  return Response.json({ ok: true, next: (count ?? 0) === 0 ? "/new" : "/admin" });
}
