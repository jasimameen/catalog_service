import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./database";

/**
 * Session-aware Supabase client for Server Components, Server Functions and
 * Route Handlers in the /admin app. Reads/writes go through the signed-in
 * user's own JWT, so Postgres RLS enforces "only this account's data" —
 * there is no separate authorization check to forget.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render (no response to attach
          // Set-Cookie to). Session refresh already happened in proxy.ts,
          // so this is safe to ignore.
        }
      },
    },
  });
}
