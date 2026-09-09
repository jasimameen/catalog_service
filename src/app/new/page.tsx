import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getRootDomain } from "@/lib/tenant";
import { BuilderClient } from "./BuilderClient";

// The wizard reads the signed-in account fresh every visit (no draft is
// persisted server-side — see BuilderClient's top comment), so this page
// should never serve a cached/static render.
export const dynamic = "force-dynamic";

/**
 * Thin server wrapper: resolves the signed-in account (redirects to
 * /auth/sign-in if there isn't one — requireAccount() does this; note
 * src/proxy.ts does not gate /new the way it gates /admin, so this is the
 * only auth check on this route) and hands it to the client-side wizard as
 * plain props. All wizard interactivity (step state, draft items, template/
 * accent selection, live preview) lives in BuilderClient.
 */
export default async function NewCatalogPage() {
  const account = await requireAccount();

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Computed here (once per request, in a Server Component) rather than in
  // BuilderClient with `Date.now()` at render time — the latter trips the
  // react-hooks "purity" lint rule (impure call during render) and there's
  // no need for it to be reactive on the client anyway.
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(account.trial_ends_at).getTime() - Date.now()) / 86_400_000)
  );

  return (
    <BuilderClient
      account={{
        id: account.id,
        name: account.name,
        currency: account.currency,
      }}
      trialDaysLeft={trialDaysLeft}
      ownerEmail={user?.email ?? ""}
      rootDomain={getRootDomain()}
    />
  );
}
