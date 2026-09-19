import { sendRecoveryLinkEmail } from "@/lib/auth/recovery-mail";
import { authCallbackUrl } from "@/lib/auth/request-origin";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { getServiceClient } from "@/lib/supabase/service";

const GENERIC_OK = {
  ok: true as const,
  message: "If an account exists for that email, we sent a reset link. Check your inbox.",
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Supabase isn't configured yet. See SETUP.md." }, { status: 500 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !isEmail(email)) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }

  // Build the link ourselves and send via app SMTP. Supabase Auth's own
  // mailer (resetPasswordForEmail) uses dashboard SMTP, which can fail
  // without the form knowing — and we must not send a second copy.
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: authCallbackUrl(request, "/reset-password") },
  });
  if (error || !data.properties?.action_link) {
    if (error) console.error("generate recovery link failed", error.message);
    return Response.json(GENERIC_OK);
  }

  const sent = await sendRecoveryLinkEmail({ to: email, resetUrl: data.properties.action_link });
  if (!sent) {
    console.error("Recovery email not sent (SMTP missing or rejected).");
  }

  return Response.json(GENERIC_OK);
}
