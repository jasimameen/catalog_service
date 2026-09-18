import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authCallbackUrl } from "@/lib/auth/request-origin";

const GENERIC_OK = {
  ok: true as const,
  message: "If an account exists for that email, we sent a reset link. Check your inbox.",
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
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

  const supabase = await getServerSupabase();
  // Always return the same copy — do not reveal whether the address exists.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl(request, "/reset-password"),
  });
  if (error) {
    console.error("resetPasswordForEmail failed", error.message);
  }

  return Response.json(GENERIC_OK);
}
