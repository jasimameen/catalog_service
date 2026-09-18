import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requestOrigin } from "@/lib/auth/request-origin";
import { companyNameFromUser, provisionAccount, safeNextPath } from "@/lib/auth/provision";

/**
 * Supabase email-confirm / recovery landing. PKCE sends `?code=`, some
 * templates send `?token_hash=&type=`. Either way we establish a session,
 * provision the account if needed, and send the user on.
 *
 * Recovery links must land here (not /reset-password) so the code is
 * exchanged before the new-password form. `next=/reset-password` or
 * `type=recovery` sends them to that form.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = url.searchParams.get("next");
  const next = type === "recovery"
    ? "/reset-password"
    : safeNextPath(requestedNext, "/new");
  const origin = requestOrigin(request);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");

  const supabase = await getServerSupabase();

  let authError: { message: string } | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    authError = error;
  } else {
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  }

  if (authError) {
    const failed = type === "recovery" || next === "/reset-password"
      ? `${origin}/auth/forgot-password?error=expired`
      : `${origin}/auth/sign-in?error=confirm`;
    return NextResponse.redirect(failed);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await provisionAccount(user.id, companyNameFromUser(user));
  }

  return NextResponse.redirect(`${origin}${next}`);
}
