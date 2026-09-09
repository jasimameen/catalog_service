import { getServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
