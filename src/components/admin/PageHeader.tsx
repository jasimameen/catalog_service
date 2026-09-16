import type { AccountRow } from "@/lib/supabase/types";
import { initialsFor } from "@/app/admin/_lib/urls";

export function PageHeader({
  title,
  subtitle,
  account,
  email,
}: {
  title: string;
  subtitle: string;
  account: AccountRow;
  email?: string;
}) {
  const label = account.name.trim() || email?.trim() || "Account";

  return (
    <header className="relative z-[5] flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--cat-border)] bg-white/85 py-3.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] backdrop-blur-xl print:hidden sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] md:sticky md:top-0">
      <div className="min-w-0 flex-1 basis-[min(100%,12.5rem)]">
        <h1 className="m-0 text-[20px] font-semibold tracking-tight break-words text-[var(--cat-ink)]">
          {title}
        </h1>
        <p className="m-0 mt-0.5 text-xs leading-snug break-words text-[#86868b] sm:truncate">
          {subtitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="hidden max-w-[220px] truncate text-xs text-[var(--cat-muted)] sm:inline">
          {label}
        </span>
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0f4] text-[11px] font-semibold text-[var(--cat-ink)]"
        >
          {initialsFor(label)}
        </span>
      </div>
    </header>
  );
}
