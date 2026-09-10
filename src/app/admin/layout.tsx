import { Suspense } from "react";
import Link from "next/link";
import { requireAccount } from "@/lib/auth/current-account";
import { isBillingConfigured } from "@/lib/billing/config";
import { MONTHLY_PRICE_LABEL } from "@/lib/billing/plan";
import {
  billingBannerCopy,
  canPublishNewCatalog,
  formatRenewsAt,
  isPaid,
  trialDaysLeft,
} from "@/lib/billing/status";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { AdminNav } from "@/components/admin/AdminNav";
import { PRODUCT_NAME } from "@/lib/brand";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SubscribeButton } from "@/components/admin/SubscribeButton";

async function TrialCard() {
  const account = await requireAccount();
  const paid = isPaid(account);
  const daysLeft = trialDaysLeft(account.trial_ends_at);
  const renews = formatRenewsAt(account.ls_renews_at);
  const configured = isBillingConfigured();
  const pastDue = account.ls_status === "past_due";
  const ended = account.ls_status === "cancelled" || (!paid && daysLeft === 0);

  let title = `Trial · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
  let body = `Then ${MONTHLY_PRICE_LABEL}. Your catalogs stay live.`;
  if (paid) {
    title = `Pro · ${MONTHLY_PRICE_LABEL}`;
    body = renews ? `Renews ${renews}.` : "Your catalogs stay live.";
  } else if (pastDue) {
    title = "Past due";
    body = "Subscribe to keep publishing new catalogs. Existing ones stay live.";
  } else if (ended) {
    title = "Trial ended";
    body = "Subscribe to publish a new catalog. Existing catalogs stay live.";
  }

  return (
    <div className="hidden rounded-xl border border-[var(--cat-border)] bg-white p-3.5 md:block">
      <p className="m-0 text-xs font-semibold text-[var(--cat-ink)]">{title}</p>
      <p className="m-0 mb-2.5 mt-1.5 text-xs leading-relaxed text-[var(--cat-muted)]">{body}</p>
      {paid ? (
        <Link
          href="/admin/settings"
          className="block w-full rounded-lg border border-[#d2d2d7] bg-white py-1.5 text-center text-xs font-medium text-[var(--cat-ink)]"
        >
          Billing
        </Link>
      ) : (
        <SubscribeButton configured={configured} variant="nav" />
      )}
    </div>
  );
}

function TrialCardFallback() {
  return (
    <div className="hidden h-[132px] rounded-xl border border-[var(--cat-border)] bg-white p-3.5 md:block">
      <div className="h-3 w-24 animate-pulse rounded bg-[#f0f0f4]" />
      <div className="mt-2.5 h-8 w-full animate-pulse rounded bg-[#f0f0f4]" />
    </div>
  );
}

async function BillingBanner() {
  const account = await requireAccount();
  const message = billingBannerCopy(account);
  if (!message) return null;

  return (
    <div className="border-b border-[#f3d2c6] bg-[#fff6f2] px-5 py-2.5 text-[13px] text-[#8a3b24] print:hidden sm:px-8">
      {message}{" "}
      <Link href="/admin/settings" className="font-medium underline">
        Go to billing
      </Link>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      <aside className="flex shrink-0 flex-row items-center gap-4 border-b border-[var(--cat-border)] bg-[#fbfbfd] p-3.5 print:hidden md:w-[236px] md:flex-col md:items-stretch md:border-b-0 md:border-r">
        <Link href="/admin" className="flex items-center gap-2.5 px-2">
          <CatalogLogo size={28} />
          <span className="hidden text-[14px] font-semibold tracking-tight text-[var(--cat-ink)] md:inline">
            {PRODUCT_NAME}
          </span>
        </Link>

        <NewCatalogLink />

        <AdminNav />

        <div className="mt-auto flex flex-col gap-2">
          <Suspense fallback={<TrialCardFallback />}>
            <TrialCard />
          </Suspense>
          <SignOutButton variant="nav" />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <BillingBanner />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

async function NewCatalogLink() {
  const account = await requireAccount();
  const allowed = canPublishNewCatalog(account);

  if (!allowed) {
    return (
      <Link
        href="/admin/settings"
        title="Subscribe to publish a new catalog"
        className="hidden shrink-0 rounded-[10px] bg-[var(--cat-accent)] px-4 py-2 text-center text-[13px] font-medium text-white opacity-50 md:block"
      >
        New catalog
      </Link>
    );
  }

  return (
    <Link
      href="/new"
      className="hidden shrink-0 rounded-[10px] bg-[var(--cat-accent)] px-4 py-2 text-center text-[13px] font-medium text-white md:block"
    >
      New catalog
    </Link>
  );
}
