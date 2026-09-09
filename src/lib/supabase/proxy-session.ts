import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./env";
import type { Database } from "./database";

/**
 * Refreshes the Supabase auth session cookie on every request to the root
 * host (marketing + /admin + /auth), per Supabase's documented proxy/
 * middleware pattern for Next.js. Called from src/proxy.ts.
 */
export async function refreshSupabaseSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  if (!isSupabaseConfigured()) {
    // Supabase isn't set up yet — let pages render their own "not configured"
    // notice instead of throwing here on every request.
    return { response: NextResponse.next(), user: null };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
