import { isOperatorEmail } from "@/lib/auth/email-verified";
import { FREE_TIER_MAX_CATALOGS, PAID_MAX_CATALOGS } from "@/lib/billing/plan";
import type { AccountRow, LsStatus } from "@/lib/supabase/types";

export type BillingAccount = Pick<AccountRow, "ls_status" | "trial_ends_at"> & {
  comp?: boolean | null;
  max_catalogs?: number | null;
};

export type PublishCheck = {
  email?: string | null;
  catalogCount?: number;
};

export function trialDaysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : 0;
}

export function isPaid(account: Pick<AccountRow, "ls_status">): boolean {
  return account.ls_status === "active" || account.ls_status === "trialing";
}

export function isComp(account: Pick<BillingAccount, "comp">): boolean {
  return account.comp === true;
}

export function isOperatorActor(email?: string | null): boolean {
  return isOperatorEmail(email);
}

/** Paid, Lemon trial, in-app trial, operator, or a comp grant. */
export function hasActiveAccess(account: BillingAccount, email?: string | null): boolean {
  if (isOperatorEmail(email)) return true;
  if (isComp(account)) return true;
  if (isPaid(account)) return true;
  if (account.ls_status === "past_due" || account.ls_status === "cancelled") return false;
  return trialDaysLeft(account.trial_ends_at) > 0;
}

/** Public catalog stays up. Operators and comp grants never pause. */
export function isStorefrontLive(account: BillingAccount, ownerEmail?: string | null): boolean {
  return hasActiveAccess(account, ownerEmail);
}

/**
 * `null` = unlimited. Operator email is always unlimited.
 * `accounts.max_catalogs` overrides the plan default when set.
 */
export function catalogLimit(account: BillingAccount, email?: string | null): number | null {
  if (isOperatorEmail(email)) return null;
  if (typeof account.max_catalogs === "number" && Number.isFinite(account.max_catalogs)) {
    return Math.max(0, Math.floor(account.max_catalogs));
  }
  if (isPaid(account) || isComp(account)) return PAID_MAX_CATALOGS;
  if (hasActiveAccess(account, email)) return FREE_TIER_MAX_CATALOGS;
  return 0;
}

export type PlanKind = "subscribed" | "trial" | "none";

/** Lemon Squeezy paid/trialing vs in-app trial vs expired. Comp / operator count as subscribed. */
export function planKind(account: BillingAccount, email?: string | null): PlanKind {
  if (isOperatorEmail(email) || isComp(account) || isPaid(account)) return "subscribed";
  if (account.ls_status === "past_due" || account.ls_status === "cancelled") return "none";
  return trialDaysLeft(account.trial_ends_at) > 0 ? "trial" : "none";
}

export function planLabel(account: BillingAccount, email?: string | null): string {
  if (isOperatorEmail(email)) return "Operator";
  if (isComp(account)) {
    const cap = catalogLimit(account, email);
    return cap == null ? "Comp" : `Comp · ${cap}`;
  }
  if (account.ls_status === "active") return "Subscribed";
  if (account.ls_status === "trialing") return "Lemon trial";
  if (account.ls_status === "past_due") return "Past due";
  if (account.ls_status === "cancelled") return "Cancelled";
  const days = trialDaysLeft(account.trial_ends_at);
  if (days > 0) return `Trial · ${days}d`;
  return "None";
}

/** Paid, trial, comp, or operator. Past-due / cancelled / trial-ended cannot publish. */
export function canPublishNewCatalog(account: BillingAccount, options?: PublishCheck): boolean {
  const email = options?.email;
  if (!hasActiveAccess(account, email)) return false;
  const limit = catalogLimit(account, email);
  if (limit == null) return true;
  if (options?.catalogCount == null) return true;
  return options.catalogCount < limit;
}

export function formatRenewsAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function billingBannerCopy(
  account: BillingAccount,
  options?: PublishCheck
): string | null {
  if (isOperatorEmail(options?.email)) return null;
  if (!hasActiveAccess(account, options?.email)) {
    if (account.ls_status === "past_due") {
      return "Payment is past due. Subscribe to open the shop again. You can still use settings and billing here.";
    }
    if (account.ls_status === "cancelled") {
      return "Your subscription ended. Subscribe to open the shop again. You can still use settings and billing here.";
    }
    return "Your trial has ended. Subscribe to open the shop again. You can still use settings and billing here.";
  }
  const limit = catalogLimit(account, options?.email);
  if (limit != null && options?.catalogCount != null && options.catalogCount >= limit) {
    return `This plan includes ${limit} ${limit === 1 ? "catalog" : "catalogs"}. Subscribe or ask us to raise the limit.`;
  }
  return null;
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
