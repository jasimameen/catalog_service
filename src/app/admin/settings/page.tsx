import { requireAccount } from "@/lib/auth/current-account";
import { PageHeader } from "@/components/admin/PageHeader";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { NotificationsForm, CompanyForm } from "./SettingsForms";

const MONTHLY_PRICE = 19;

export default async function SettingsPage() {
  const account = await requireAccount();
  const trialEnds = new Date(account.trial_ends_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <PageHeader title="Settings" subtitle="Plan, notifications and company details" account={account} />
      <div className="flex max-w-[680px] flex-col gap-[18px] p-4 pb-16 sm:p-8">
        <div className="rounded-2xl bg-[var(--cat-ink)] p-6 text-white">
          <p className="m-0 text-[13px] text-[#a1a1a6]">Trial ends {trialEnds}</p>
          <p className="m-0 mt-2 text-[34px] font-semibold tracking-tight">${MONTHLY_PRICE} / month</p>
          <p className="m-0 mb-5 mt-2 text-[13px] text-[#a1a1a6]">
            Unlimited catalogs, items and team members.
          </p>
          {/* Billing is UI-only for now — no payment processor is wired up (see
              PLAN.md "Known gaps"). Disabled rather than faked. */}
          <button
            type="button"
            disabled
            title="Payments aren't set up yet"
            className="cursor-not-allowed rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-[var(--cat-ink)] opacity-60"
          >
            Add payment method
          </button>
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
