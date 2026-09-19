import Link from "next/link";
import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { isBillingConfigured } from "@/lib/billing/config";
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_USD } from "@/lib/billing/plan";
import { formatRenewsAt, isPaid, trialDaysLeft } from "@/lib/billing/status";
import { PageHeader } from "@/components/admin/PageHeader";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SubscribeButton } from "@/components/admin/SubscribeButton";
import { getLastMailError, isMailConfigured } from "@/lib/mail";
import { NotificationsForm, CompanyForm, MailStatusCard } from "./SettingsForms";

export default async function SettingsPage() {
  const account = await requireAccount();
  const user = await getSessionUser();
  const email = user?.email ?? "";
  const paid = isPaid(account);
  const daysLeft = trialDaysLeft(account.trial_ends_at);
  const renews = formatRenewsAt(account.ls_renews_at);
  const trialEnds = new Date(account.trial_ends_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
  const configured = isBillingConfigured();

  let eyebrow = `Trial ends ${trialEnds}`;
  if (paid) {
    eyebrow = renews ? `Pro · renews ${renews}` : "Pro";
  } else if (account.ls_status === "past_due") {
    eyebrow = "Past due";
  } else if (account.ls_status === "cancelled") {
    eyebrow = "Subscription ended";
  } else if (daysLeft === 0) {
    eyebrow = "Trial ended";
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Plan, notifications and company details"
        account={account}
        email={email}
      />
      <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-3 p-4 pb-10 sm:p-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--cat-border)] bg-white p-4">
          <h3 className="m-0 mb-1.5 text-[14px] font-semibold text-[var(--cat-ink)]">Account</h3>
          {email ? (
            <p className="m-0 mb-2.5 truncate text-[13px] text-[var(--cat-muted)]">{email}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/account"
              className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--cat-ink)] px-4 text-[13px] font-medium text-white"
            >
              Change password
            </Link>
            <SignOutButton />
          </div>
        </div>

        <div className="rounded-xl bg-[var(--cat-ink)] p-4 text-white">
          <p className="m-0 text-[12px] text-[#a1a1a6]">{eyebrow}</p>
          <p className="m-0 mt-1 text-[24px] font-semibold tracking-tight">
            {paid ? `Pro · ${MONTHLY_PRICE_LABEL}` : `$${MONTHLY_PRICE_USD} / month`}
          </p>
          <p className="m-0 mb-3 mt-1 text-[12px] text-[#a1a1a6]">
            Unlimited catalogs, items and team members.
          </p>
          {paid ? (
            <p className="m-0 text-[12px] text-[#a1a1a6]">
              {renews ? `Next renewal ${renews}.` : "Subscription is active."}
            </p>
          ) : (
            <SubscribeButton configured={configured} variant="settings" />
          )}
        </div>

        <CompanyForm account={account} email={email} />
        <NotificationsForm account={account} />
        <MailStatusCard configured={isMailConfigured()} lastError={getLastMailError()} email={email} />
      </div>
    </>
  );
}
