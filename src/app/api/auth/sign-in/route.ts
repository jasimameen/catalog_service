import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { provisionAccount } from "../sign-up/route";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase isn't configured yet. See SETUP.md." }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const password = body.password || "";
  if (!email || !password) {
    return Response.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  // Covers the "confirm email" flow: the account wasn't provisioned at
  // sign-up time because there was no session yet, so do it on first
  // successful sign-in instead. No-op if it already exists.
  await provisionAccount(data.user.id, "My company");

  return Response.json({ ok: true });
}
