import type { AccountRow } from "@/lib/supabase/types";
import { initialsFor } from "@/app/admin/_lib/urls";

export function PageHeader({
  title,
  subtitle,
  account,
}: {
  title: string;
  subtitle: string;
  account: AccountRow;
}) {
  return (
    <header className="sticky top-0 z-[5] flex items-center justify-between gap-4 border-b border-[var(--cat-border)] bg-white/85 px-5 py-3.5 backdrop-blur-xl print:hidden sm:px-8">
      <div className="min-w-0">
        <h1 className="m-0 truncate text-[20px] font-semibold tracking-tight text-[var(--cat-ink)]">
          {title}
        </h1>
        <p className="m-0 mt-0.5 truncate text-xs text-[#86868b]">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="hidden text-xs text-[var(--cat-muted)] sm:inline">{account.name}</span>
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#f0f0f4] text-[11px] font-semibold text-[var(--cat-ink)]">
          {initialsFor(account.name)}
        </span>
      </div>
    </header>
  );
}
