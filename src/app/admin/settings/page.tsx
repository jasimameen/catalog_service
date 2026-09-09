import { requireAccount } from "@/lib/auth/current-account";
import { isBillingConfigured } from "@/lib/billing/config";
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_USD } from "@/lib/billing/plan";
import { formatRenewsAt, isPaid, trialDaysLeft } from "@/lib/billing/status";
import { PageHeader } from "@/components/admin/PageHeader";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SubscribeButton } from "@/components/admin/SubscribeButton";
import { NotificationsForm, CompanyForm } from "./SettingsForms";

export default async function SettingsPage() {
  const account = await requireAccount();
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
      <PageHeader title="Settings" subtitle="Plan, notifications and company details" account={account} />
      <div className="flex max-w-[680px] flex-col gap-[18px] p-4 pb-16 sm:p-8">
        <div className="rounded-2xl bg-[var(--cat-ink)] p-6 text-white">
          <p className="m-0 text-[13px] text-[#a1a1a6]">{eyebrow}</p>
          <p className="m-0 mt-2 text-[34px] font-semibold tracking-tight">
            {paid ? `Pro · ${MONTHLY_PRICE_LABEL}` : `$${MONTHLY_PRICE_USD} / month`}
          </p>
          <p className="m-0 mb-5 mt-2 text-[13px] text-[#a1a1a6]">
            Unlimited catalogs, items and team members.
          </p>
          {paid ? (
            <p className="m-0 text-[13px] text-[#a1a1a6]">
              {renews ? `Next renewal ${renews}.` : "Subscription is active."}
            </p>
          ) : (
            <SubscribeButton configured={configured} variant="settings" />
          )}
        </div>

        <NotificationsForm account={account} />
        <CompanyForm account={account} />

        <div className="rounded-2xl border border-[var(--cat-border)] p-[22px]">
          <h3 className="m-0 mb-3 text-[15px] font-semibold text-[var(--cat-ink)]">Account</h3>
          <SignOutButton />
        </div>
      </div>
    </>
  );
}
