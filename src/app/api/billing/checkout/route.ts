import { getSessionUser } from "@/lib/auth/current-account";
import { createLemonCheckout } from "@/lib/billing/lemonsqueezy";
import { isBillingConfigured } from "@/lib/billing/config";
import { getServerSupabase } from "@/lib/supabase/server";
import { getRootDomain } from "@/lib/tenant";

export const runtime = "nodejs";

function checkoutRedirectUrl(request: Request): string {
  const root = getRootDomain();
  if (root.startsWith("localhost")) {
    return `${new URL(request.url).origin}/admin/settings`;
  }
  return `https://${root}/admin/settings`;
}

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return Response.json({ error: "Billing isn't configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = await getServerSupabase();
  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return Response.json({ error: "No account found." }, { status: 404 });
  }

  const result = await createLemonCheckout({
    accountId: membership.account_id,
    email: user.email ?? undefined,
    redirectUrl: checkoutRedirectUrl(request),
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({ url: result.url });
}
