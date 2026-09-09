import "server-only";
import type { User } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/service";

export function companyNameFromUser(user: User, fallback = "My company"): string {
  const raw = user.user_metadata?.company_name ?? user.user_metadata?.companyName;
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 120);
  return fallback;
}

/**
 * Creates the account + owner membership for a brand-new user. Uses the
 * service-role client since there's no INSERT policy on accounts /
 * account_members. Safe to call more than once — no-op if a membership
 * already exists.
 */
export async function provisionAccount(userId: string, companyName: string): Promise<boolean> {
  try {
    const service = getServiceClient();

    const { data: existing } = await service
      .from("account_members")
      .select("account_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return true;

    const name = companyName.trim().slice(0, 120) || "My company";
    const { data: account, error: accountError } = await service
      .from("accounts")
      .insert({ name })
      .select("id")
      .single();
    if (accountError || !account) {
      console.error("provisionAccount: failed to create account", accountError);
      return false;
    }

    const { error: memberError } = await service
      .from("account_members")
      .insert({ account_id: account.id, user_id: userId, role: "owner" });
    if (memberError) {
      console.error("provisionAccount: failed to create membership", memberError);
      return false;
    }

    return true;
  } catch (err) {
    console.error("provisionAccount: unexpected error", err);
    return false;
  }
}

/** Relative in-app path only — never a protocol-relative or external URL. */
export function safeNextPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
