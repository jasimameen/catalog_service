import { getServerSupabase } from "@/lib/supabase/server";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { DISPOSABLE_EMAIL_ERROR, isDisposableEmail } from "@/lib/auth/disposable-email-domains";
import { sendEmailOtpForUser, OTP_COOLDOWN_SECONDS } from "@/lib/auth/email-otp";
import { findUserByEmail, isEmailAddress } from "@/lib/auth/find-user";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Supabase isn't configured yet. See SETUP.md." }, { status: 500 });
  }

  let body: { email?: string; password?: string; companyName?: string; resend?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const companyName = (body.companyName || "").trim().slice(0, 120) || "My company";
  const resend = body.resend === true;

  if (!email || !isEmailAddress(email)) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return Response.json({ error: DISPOSABLE_EMAIL_ERROR }, { status: 400 });
  }

  const service = getServiceClient();
  let user = await findUserByEmail(email);

  if (resend) {
    if (user?.email_confirmed_at) {
      return Response.json({ ok: true, needsVerification: true, cooldownSeconds: OTP_COOLDOWN_SECONDS });
    }
    if (!user) {
      return Response.json({ ok: true, needsVerification: true, cooldownSeconds: OTP_COOLDOWN_SECONDS });
    }
    const sent = await sendEmailOtpForUser(user);
    if (!sent.ok) {
      return Response.json(
        { error: sent.error, cooldownSeconds: sent.cooldownSeconds ?? OTP_COOLDOWN_SECONDS },
        { status: sent.cooldownSeconds ? 429 : 400 },
      );
    }
    return Response.json({ ok: true, needsVerification: true, cooldownSeconds: sent.cooldownSeconds });
  }

  if (!password || password.length < 8) {
    return Response.json(
      { error: "Enter a valid email and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  if (user?.email_confirmed_at) {
    return Response.json({ error: "An account with this email already exists. Sign in." }, { status: 400 });
  }

  if (user) {
    const { error } = await service.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { ...user.user_metadata, company_name: companyName },
    });
    if (error) {
      console.error("sign-up update existing user failed", error.message);
      return Response.json({ error: "Could not create your account. Please try again." }, { status: 500 });
    }
    const refreshed = await findUserByEmail(email);
    if (refreshed) user = refreshed;
  } else {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { company_name: companyName },
    });
    if (error || !data.user) {
      const existing = await findUserByEmail(email);
      if (existing && !existing.email_confirmed_at) {
        const { error: updateError } = await service.auth.admin.updateUserById(existing.id, {
          password,
          user_metadata: { ...existing.user_metadata, company_name: companyName },
        });
        if (updateError) {
          console.error("sign-up createUser failed", error?.message);
          return Response.json({ error: publicSignUpError(updateError.message) }, { status: 400 });
        }
        user = existing;
      } else {
        console.error("sign-up createUser failed", error?.message);
        return Response.json({ error: publicSignUpError(error?.message) }, { status: 400 });
      }
    } else {
      user = data.user;
    }
  }

  // Never leave a cookie session before the code is checked.
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();

  const sent = await sendEmailOtpForUser(user);
  if (!sent.ok) {
    return Response.json(
      { error: sent.error, cooldownSeconds: sent.cooldownSeconds ?? OTP_COOLDOWN_SECONDS },
      { status: sent.cooldownSeconds ? 429 : 400 },
    );
  }

  return Response.json({ ok: true, needsVerification: true, cooldownSeconds: sent.cooldownSeconds });
}

function publicSignUpError(message: string | undefined): string {
  if (message && /password/i.test(message)) return message;
  return "Could not create your account. Please try again.";
}
