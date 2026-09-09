import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return Response.json({ ok: true });
  }

  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
