import "server-only";
import { getMobileSupabase } from "@/lib/supabase/mobile";
import type { AccountRow, CatalogRow } from "@/lib/supabase/types";

export class MobileAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new MobileAuthError("Missing bearer token.");
  return token;
}

/**
 * Resolves the calling mobile user's account + a Supabase client scoped to
 * their token (so every subsequent query is RLS-checked as them), mirroring
 * requireAccount() (src/lib/auth/current-account.ts) for the cookie-based
 * web app.
 */
export async function requireMobileAccount(
  request: Request,
): Promise<{ account: AccountRow; supabase: ReturnType<typeof getMobileSupabase> }> {
  const token = bearerToken(request);
  const supabase = getMobileSupabase(token);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new MobileAuthError("Session expired. Sign in again.");
  }

  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) throw new MobileAuthError("No account found for this sign-in.", 404);

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", membership.account_id)
    .single();
  if (accountError || !account) throw new MobileAuthError("No account found for this sign-in.", 404);

  return { account: account as AccountRow, supabase };
}

/**
 * The catalog this account is operating from the mobile app. Accounts can
 * have several catalogs (multi-store) — the app remembers the merchant's
 * pick and sends it back as the `X-Catalog-Id` header on every call; absent
 * that (first launch, or the id no longer belongs to this account), it
 * falls back to the earliest catalog by creation date.
 */
export async function requireMobileCatalog(
  supabase: ReturnType<typeof getMobileSupabase>,
  account: AccountRow,
  request?: Request,
): Promise<CatalogRow> {
  const requestedId = request?.headers.get("x-catalog-id");
  if (requestedId) {
    const { data } = await supabase
      .from("catalogs")
      .select("*")
      .eq("id", requestedId)
      .eq("account_id", account.id)
      .maybeSingle();
    if (data) return data as CatalogRow;
    // Falls through to the default catalog below if the id is stale/invalid.
  }

  const { data, error } = await supabase
    .from("catalogs")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new MobileAuthError("No catalog set up yet for this account.", 404);
  return data as CatalogRow;
}

export function mobileErrorResponse(error: unknown): Response {
  if (error instanceof MobileAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("mobile api error", error);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
