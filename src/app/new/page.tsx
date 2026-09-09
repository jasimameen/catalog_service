import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getRootDomain } from "@/lib/tenant";
import { BuilderClient } from "./BuilderClient";

// The wizard reads the signed-in account fresh every visit (no draft is
// persisted server-side — see BuilderClient's top comment), so this page
// should never serve a cached/static render.
export const dynamic = "force-dynamic";

function daysLeftOnTrial(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : 0;
}

/**
 * Thin server wrapper: resolves the signed-in account (redirects to
 * /auth/sign-in if there isn't one — requireAccount() does this; note
 * src/proxy.ts does not gate /new the way it gates /admin, so this is the
 * only auth check on this route) and hands it to the client-side wizard as
 * plain props. All wizard interactivity (step state, draft items, template/
 * accent selection, live preview) lives in BuilderClient.
 */
export default async function NewCatalogPage() {
  const account = await requireAccount({ next: "/new" });

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const trialDaysLeft = daysLeftOnTrial(account.trial_ends_at);

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
