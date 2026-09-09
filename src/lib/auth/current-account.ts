import "server-only";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { AccountRow } from "@/lib/supabase/types";

/**
 * Resolves the signed-in user's account for use in Server Components /
 * Server Functions under /admin and /new. Redirects to sign-in if there's
 * no session (belt-and-suspenders — src/proxy.ts already gates /admin, but
 * /new and Server Functions can be hit directly).
 *
 * Every account currently has exactly one owner (see PLAN.md "Known gaps" —
 * team invites aren't built), so "the user's account" is unambiguous.
 */
export async function requireAccount(): Promise<AccountRow> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    // Signed in but no account row yet — shouldn't happen (sign-up
    // provisions one), but fail safe rather than crash the page.
    redirect("/auth/sign-in?error=no-account");
  }

  const { data: account, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", membership.account_id)
    .single();

  if (error || !account) {
    redirect("/auth/sign-in?error=no-account");
  }

  return account as AccountRow;
}
