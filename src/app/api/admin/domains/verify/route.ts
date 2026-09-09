import { getServerSupabase } from "@/lib/supabase/server";
import { verifyCustomDomain } from "@/lib/domains/verify";

/**
 * Triggers a DNS/provider verification check for one custom domain — the
 * Admin Domains page's "Check now" button. Authorization: verify.ts itself
 * uses the service client (it has to, to write the result regardless of
 * RLS), so this route does its own ownership check first with the
 * session-scoped client, which RLS will only let succeed if the domain
 * belongs to a catalog owned by the signed-in user's account.
 */
export async function POST(request: Request) {
  let body: { domainId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const domainId = body.domainId;
  if (!domainId) {
    return Response.json({ error: "Missing domainId." }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data: owned } = await supabase.from("domains").select("id").eq("id", domainId).maybeSingle();
  if (!owned) {
    return Response.json({ error: "Domain not found." }, { status: 404 });
  }

  const result = await verifyCustomDomain(domainId);
  return Response.json(result);
}
