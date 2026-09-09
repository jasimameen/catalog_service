import { getServerSupabase } from "@/lib/supabase/server";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { provisionAccount } from "@/lib/auth/provision";
import { sendMail } from "@/lib/mail";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName },
      emailRedirectTo: callbackUrl(request),
    },
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (!data.user) {
    return Response.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }

  // Empty identities = Supabase's anti-enumeration stub for an existing email.
  // Don't create a real account row for that fake user id.
  const realUser = Boolean(data.session || (data.user.identities && data.user.identities.length > 0));

  if (realUser) {
    const provisioned = await provisionAccount(data.user.id, companyName);
    if (!provisioned && data.session) {
      return Response.json(
        { error: "Signed up, but couldn't set up your account. Check SUPABASE_SECRET_KEY (see SETUP.md)." },
        { status: 500 }
      );
    }
    if (provisioned) {
      await sendWelcomeEmail(email, companyName);
    }
  }

  if (!data.session) {
    return Response.json({ ok: true, needsConfirmation: true });
  }

  return Response.json({ ok: true, needsConfirmation: false });
}

function callbackUrl(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const proto =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http";
  return `${proto}://${host}/auth/callback`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendWelcomeEmail(to: string, companyName: string) {
  const company = companyName.trim() || "your company";
  const subject = "Welcome to Instant Catalog";
  const text = `Welcome to Instant Catalog.

Your account for ${company} is ready. Sign in and start a catalog.

— Instant Catalog`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:560px;">
  <p style="margin:0 0 12px;">Welcome to Instant Catalog.</p>
  <p style="margin:0 0 12px;">Your account for <strong>${escapeHtml(company)}</strong> is ready. Sign in and start a catalog.</p>
  <p style="margin:0;color:#46505e;">— Instant Catalog</p>
</div>`;

  try {
    await sendMail({ to, subject, text, html });
  } catch (err) {
    console.error("Welcome email failed", err);
  }
}
