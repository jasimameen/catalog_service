import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./database";

/**
 * Token-scoped Supabase client for the mobile REST API — the equivalent of
 * getServerSupabase() (src/lib/supabase/server.ts) for requests that carry
 * an `Authorization: Bearer <access_token>` header instead of cookies.
 *
 * Every query still runs as that user's own JWT, so RLS enforces "own
 * account only" exactly like the cookie-based web client — there is no
 * separate authorization check to forget here either.
 */
export function getMobileSupabase(accessToken: string) {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
