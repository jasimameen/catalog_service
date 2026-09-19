import "server-only";
import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { canManageSetupInquiries } from "@/lib/inquiries/access";
import type { AccountRow } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";

/** Same gate as the setup inbox: @hevyf.com, INQUIRY_NOTIFY, working Hevyf logins. */
export function canOperatePlatform(email: string | null | undefined): boolean {
  return canManageSetupInquiries(email);
}

export async function requirePlatformOperator(next = "/admin/ops"): Promise<
  | { ok: true; account: AccountRow; user: User }
  | { ok: false; error: string; account: AccountRow; user: User | null }
> {
  const account = await requireAccount({ next });
  const user = await getSessionUser();
  if (!user || !canOperatePlatform(user.email)) {
    return {
      ok: false,
      error: "This desk is only for Instant Catalog operators.",
      account,
      user,
    };
  }
  return { ok: true, account, user };
}
