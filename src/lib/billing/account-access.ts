import "server-only";
import { cache } from "react";
import { hasActiveAccess, type BillingAccount } from "@/lib/billing/status";
import { getServiceClient } from "@/lib/supabase/service";
import type { AccountRow } from "@/lib/supabase/types";

const ACCOUNT_BILLING =
  "id, ls_status, trial_ends_at, comp, max_catalogs, order_email" as const;
const ACCOUNT_BILLING_FALLBACK = "id, ls_status, trial_ends_at, order_email" as const;

function asBilling(row: Partial<AccountRow> | null | undefined): BillingAccount | null {
  if (!row) return null;
  return {
    ls_status: row.ls_status ?? null,
    trial_ends_at: row.trial_ends_at ?? new Date(0).toISOString(),
    comp: row.comp === true,
    max_catalogs: typeof row.max_catalogs === "number" ? row.max_catalogs : null,
  };
}

export async function loadAccountBilling(
  accountId: string
): Promise<(BillingAccount & { order_email: string | null }) | null> {
  const service = getServiceClient();
  const full = await service.from("accounts").select(ACCOUNT_BILLING).eq("id", accountId).maybeSingle();
  const row = (full.error ? null : full.data) as Partial<AccountRow> | null;
  if (row) {
    const billing = asBilling(row);
    return billing ? { ...billing, order_email: row.order_email ?? null } : null;
  }

  const fallback = await service
    .from("accounts")
    .select(ACCOUNT_BILLING_FALLBACK)
    .eq("id", accountId)
    .maybeSingle();
  const next = fallback.data as Partial<AccountRow> | null;
  const billing = asBilling(next);
  return billing ? { ...billing, order_email: next?.order_email ?? null } : null;
}

export async function ownerEmailForAccount(accountId: string): Promise<string | null> {
  const service = getServiceClient();
  const { data: members } = await service
    .from("account_members")
    .select("user_id, role")
    .eq("account_id", accountId);

  const owner = (members ?? []).find((row) => row.role === "owner") ?? (members ?? [])[0];
  if (!owner) {
    const account = await loadAccountBilling(accountId);
    return account?.order_email?.toLowerCase() || null;
  }

  try {
    const { data } = await service.auth.admin.getUserById(owner.user_id);
    const email = data.user?.email?.trim().toLowerCase();
    if (email) return email;
  } catch (error) {
    console.error("ownerEmailForAccount", error);
  }

  const account = await loadAccountBilling(accountId);
  return account?.order_email?.toLowerCase() || null;
}

export const catalogStorefrontLive = cache(async (catalogId: string): Promise<boolean> => {
  if (!catalogId) return false;
  const service = getServiceClient();
  const { data: catalog } = await service
    .from("catalogs")
    .select("account_id")
    .eq("id", catalogId)
    .maybeSingle();
  if (!catalog?.account_id) return false;
  const [account, ownerEmail] = await Promise.all([
    loadAccountBilling(catalog.account_id),
    ownerEmailForAccount(catalog.account_id),
  ]);
  if (!account) return false;
  return hasActiveAccess(account, ownerEmail);
});

export async function countAccountCatalogs(accountId: string): Promise<number> {
  const service = getServiceClient();
  const { count } = await service
    .from("catalogs")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  return count ?? 0;
}
