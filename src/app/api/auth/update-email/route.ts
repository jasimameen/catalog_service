import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authCallbackUrl } from "@/lib/auth/request-origin";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in again to change your email." }, { status: 401 });
  }
  if (user.email?.toLowerCase() === email) {
    return Response.json({ error: "That is already your signed-in email." }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: authCallbackUrl(request, "/admin/account") },
  );
  if (error) {
    return Response.json({ error: error.message || "Could not update your email." }, { status: 400 });
  }

  return Response.json({
    ok: true,
    message: "Check your inbox to confirm the new email.",
  });
}
