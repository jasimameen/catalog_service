"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./database";

let cached: SupabaseClient<Database> | null = null;

/** Browser Supabase client for Client Components (sign in/up, live forms). */
export function getBrowserSupabase() {
  if (cached) return cached;
  cached = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
  return cached;
}
