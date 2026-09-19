import { notifyPasswordChanged } from "@/lib/auth/password-changed-mail";
import { requestOrigin } from "@/lib/auth/request-origin";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase isn't configured yet. See SETUP.md." }, { status: 500 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = body.password || "";
  if (password.length < 8) {
    return Response.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "This reset link is invalid or expired. Request a new one." },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return Response.json({ error: error.message || "Could not update your password." }, { status: 400 });
  }

  await notifyPasswordChanged({
    to: user.email,
    forgotPasswordUrl: `${requestOrigin(request)}/auth/forgot-password`,
  });

  return Response.json({ ok: true, next: "/admin" });
}
