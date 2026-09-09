import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";
import type { Database } from "./database";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Use this ONLY for:
 *   - reading a catalog + its items to render a public storefront (RLS keeps
 *     that data locked to account members otherwise, which is what we want
 *     for the admin dashboard, so the public read path has to go around it)
 *   - writing orders/order_items/catalog_views (anonymous visitors have no
 *     Supabase session, so they can never satisfy an RLS policy)
 *   - domain verification background checks
 *
 * Never import this into a Client Component or expose its result to one.
 */
let cached: SupabaseClient<Database> | null = null;

export function getServiceClient() {
  if (cached) return cached;
  cached = createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
