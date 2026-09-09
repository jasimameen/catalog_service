import type { AccountRow, LsStatus } from "@/lib/supabase/types";

export function trialDaysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : 0;
}

export function isPaid(account: Pick<AccountRow, "ls_status">): boolean {
  return account.ls_status === "active" || account.ls_status === "trialing";
}

/** Paid or still on the 14-day trial. Past-due / cancelled / trial-ended cannot publish. */
export function canPublishNewCatalog(
  account: Pick<AccountRow, "ls_status" | "trial_ends_at">
): boolean {
  if (isPaid(account)) return true;
  if (account.ls_status === "past_due" || account.ls_status === "cancelled") return false;
  return trialDaysLeft(account.trial_ends_at) > 0;
}

export function formatRenewsAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function billingBannerCopy(
  account: Pick<AccountRow, "ls_status" | "trial_ends_at">
): string | null {
  if (canPublishNewCatalog(account)) return null;
  if (account.ls_status === "past_due") {
    return "Payment is past due. Subscribe to publish a new catalog. Existing catalogs stay live.";
  }
  if (account.ls_status === "cancelled") {
    return "Your subscription ended. Subscribe to publish a new catalog. Existing catalogs stay live.";
  }
  return "Your trial has ended. Subscribe to publish a new catalog. Existing catalogs stay live.";
}

export function mapLemonStatus(status: string | undefined): LsStatus {
  switch (status) {
    case "on_trial":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "cancelled":
    case "expired":
    case "paused":
      return "cancelled";
    default:
      return "past_due";
  }
}
