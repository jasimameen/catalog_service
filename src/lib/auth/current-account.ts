import "server-only";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AccountRow } from "@/lib/supabase/types";
import { companyNameFromUser, provisionAccount, safeNextPath } from "./provision";

/**
 * Resolves the signed-in user's account for use in Server Components /
 * Server Functions under /admin and /new. Redirects to sign-in if there's
 * no session (belt-and-suspenders — src/proxy.ts already gates /admin, but
 * /new and Server Functions can be hit directly).
 *
 * Every account currently has exactly one owner (see PLAN.md "Known gaps" —
 * team invites aren't built), so "the user's account" is unambiguous.
 */
export async function requireAccount(options?: { next?: string }): Promise<AccountRow> {
  const signIn = options?.next
    ? `/auth/sign-in?next=${encodeURIComponent(safeNextPath(options.next, "/admin"))}`
    : "/auth/sign-in";

  if (!isSupabaseConfigured()) {
    redirect(signIn);
  }

  let supabase;
  let user;
  try {
    supabase = await getServerSupabase();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    redirect(signIn);
  }

  if (!user) {
    redirect(signIn);
  }

  const account = await loadAccount(supabase, user.id);
  if (account) return account;

  // Sign-up with "confirm email" on, or a dropped provision, leaves a
  // session with no account_members row. Create it here so /new and /admin
  // don't bounce a signed-in user back to /auth (proxy.ts would then loop
  // them to /admin).
  const provisioned = await provisionAccount(user.id, companyNameFromUser(user));
  if (provisioned) {
    const created = await loadAccount(supabase, user.id);
    if (created) return created;
  }

  throw new Error(
    "Your login worked, but the account could not be created. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (see SETUP.md) and try again."
  );
}

async function loadAccount(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  userId: string
): Promise<AccountRow | null> {
  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: account, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", membership.account_id)
    .single();

  if (error || !account) return null;
  return account as AccountRow;
}
