import Link from "next/link";
import { requireAccount } from "@/lib/auth/current-account";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";

function trialDaysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Belt-and-suspenders: src/proxy.ts already gates every /admin/* request
  // behind a session, but this is the documented-intentional source of
  // truth for the account row and a safety net if a route is ever hit
  // directly (see src/lib/auth/current-account.ts).
  const account = await requireAccount();
  const daysLeft = trialDaysLeft(account.trial_ends_at);

  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      <aside className="flex shrink-0 flex-row items-center gap-4 border-b border-[var(--cat-border)] bg-[#fbfbfd] p-3.5 md:w-[236px] md:flex-col md:items-stretch md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-[var(--cat-ink)] text-xs font-semibold text-white">
            C
          </span>
          <span className="hidden text-[14px] font-semibold tracking-tight text-[var(--cat-ink)] md:inline">
            Catalog
          </span>
        </div>

        <Link
          href="/new"
          className="hidden shrink-0 rounded-[10px] bg-[var(--cat-accent)] px-4 py-2 text-center text-[13px] font-medium text-white md:block"
        >
          New catalog
        </Link>

        <AdminNav />

        <div className="mt-auto flex flex-col gap-2">
          <div className="hidden rounded-xl border border-[var(--cat-border)] bg-white p-3.5 md:block">
            <p className="m-0 text-xs font-semibold text-[var(--cat-ink)]">
              Trial · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </p>
            <p className="m-0 mb-2.5 mt-1.5 text-xs leading-relaxed text-[var(--cat-muted)]">
              Then $19 a month. Your catalogs stay live.
            </p>
            <Link
              href="/admin/settings"
              className="block w-full rounded-lg border border-[#d2d2d7] bg-white py-1.5 text-center text-xs font-medium text-[var(--cat-ink)]"
            >
              Add payment
            </Link>
          </div>
          <SignOutButton variant="nav" />
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
