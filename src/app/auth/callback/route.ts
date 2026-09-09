import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { companyNameFromUser, provisionAccount, safeNextPath } from "@/lib/auth/provision";

/**
 * Supabase email-confirm / magic-link landing. PKCE sends `?code=`, some
 * templates send `?token_hash=&type=`. Either way we establish a session,
 * provision the account if needed, and send the user to Catalog Builder.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"), "/new");
  const origin = requestOrigin(request);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

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
    return NextResponse.redirect(`${origin}/auth/sign-in?error=confirm`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await provisionAccount(user.id, companyNameFromUser(user));
  }

  return NextResponse.redirect(`${origin}${next}`);
}

function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (isLocal ? "http" : url.protocol.replace(":", "") || "https");
  return `${proto}://${host}`;
}
