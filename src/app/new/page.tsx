import Link from "next/link";
import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { isBillingConfigured } from "@/lib/billing/config";
import { canPublishNewCatalog, isPaid, trialDaysLeft } from "@/lib/billing/status";
import { MONTHLY_PRICE_LABEL } from "@/lib/billing/plan";
import { SubscribeButton } from "@/components/admin/SubscribeButton";
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
  const account = await requireAccount({ next: "/new" });
  const user = await getSessionUser();

  if (!canPublishNewCatalog(account)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
          Subscribe to publish
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">
          Your trial or subscription isn’t active, so new catalogs can’t be published.
          Existing catalogs stay live.
        </p>
        <div className="mt-6">
          <SubscribeButton configured={isBillingConfigured()} variant="solid" />
        </div>
        <Link href="/admin" className="mt-5 text-[13px] text-[#6e6e73] underline">
          Back to catalogs
        </Link>
      </div>
    );
  }

  const daysLeft = trialDaysLeft(account.trial_ends_at);
  const planLabel = isPaid(account)
    ? `Pro · ${MONTHLY_PRICE_LABEL}`
    : `Trial · ${daysLeft} days left`;

  return (
    <BuilderClient
      account={{
        id: account.id,
        name: account.name,
        currency: account.currency,
      }}
      trialDaysLeft={daysLeft}
      planLabel={planLabel}
      ownerEmail={user?.email ?? ""}
      rootDomain={getRootDomain()}
    />
  );
}
