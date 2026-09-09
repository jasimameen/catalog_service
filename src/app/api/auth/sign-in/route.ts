import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { companyNameFromUser, provisionAccount, safeNextPath } from "@/lib/auth/provision";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Supabase isn't configured yet. See SETUP.md." }, { status: 500 });
  }

  let body: { email?: string; password?: string; next?: string };
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

  const provisioned = await provisionAccount(data.user.id, companyNameFromUser(data.user));
  if (!provisioned) {
    return Response.json(
      {
        error:
          "Signed in, but couldn't set up your account. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (see SETUP.md).",
      },
      { status: 500 }
    );
  }

  const requested = safeNextPath(body.next, "");
  if (requested) {
    return Response.json({ ok: true, next: requested });
  }

  const { count } = await supabase
    .from("catalogs")
    .select("id", { count: "exact", head: true });

  return Response.json({ ok: true, next: (count ?? 0) === 0 ? "/new" : "/admin" });
}
