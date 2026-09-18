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
import { AdminShell } from "@/components/admin/AdminShell";
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
    <div className="hidden min-w-0 overflow-hidden rounded-xl border border-[var(--cat-border)] bg-white p-3.5 md:block">
      <p className="m-0 text-xs font-semibold break-words text-[var(--cat-ink)]">{title}</p>
      <p className="m-0 mb-2.5 mt-1.5 text-xs leading-relaxed break-words text-[var(--cat-muted)]">
        {body}
      </p>
      {paid ? (
        <Link
          href="/admin/settings"
          className="block w-full min-h-11 rounded-lg border border-[#d2d2d7] bg-white text-center text-xs font-medium leading-[44px] text-[var(--cat-ink)]"
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
    <div className="hidden h-[132px] min-w-0 overflow-hidden rounded-xl border border-[var(--cat-border)] bg-white p-3.5 md:block">
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
    <div className="border-b border-[#f3d2c6] bg-[#fff6f2] py-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-[13px] leading-snug break-words text-[#8a3b24] print:hidden sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]">
      {message}{" "}
      <Link href="/admin/settings" className="font-medium underline">
        Go to billing
      </Link>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell
      newCatalog={<NewCatalogLink />}
      trial={
        <Suspense fallback={<TrialCardFallback />}>
          <TrialCard />
        </Suspense>
      }
    >
      <Suspense fallback={null}>
        <BillingBanner />
      </Suspense>
      {children}
    </AdminShell>
  );
}

async function NewCatalogLink() {
  const account = await requireAccount();
  const allowed = canPublishNewCatalog(account);

  const plus = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );

  if (!allowed) {
    return (
      <Link
        href="/admin/settings"
        title="Subscribe to publish a new catalog"
        className="hidden min-h-11 shrink-0 items-center justify-center rounded-[11px] bg-[var(--cat-accent)] px-4 text-center text-[14px] font-medium text-white opacity-50 md:flex group-data-[collapsed=true]/shell:h-11 group-data-[collapsed=true]/shell:w-11 group-data-[collapsed=true]/shell:px-0"
      >
        <span className="group-data-[collapsed=true]/shell:hidden">New catalog</span>
        <span className="hidden group-data-[collapsed=true]/shell:inline-flex">{plus}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/new"
      title="New catalog"
      className="hidden min-h-11 shrink-0 items-center justify-center rounded-[11px] bg-[var(--cat-accent)] px-4 text-center text-[14px] font-medium text-white md:flex group-data-[collapsed=true]/shell:h-11 group-data-[collapsed=true]/shell:w-11 group-data-[collapsed=true]/shell:px-0"
    >
      <span className="group-data-[collapsed=true]/shell:hidden">New catalog</span>
      <span className="hidden group-data-[collapsed=true]/shell:inline-flex">{plus}</span>
    </Link>
  );
}
