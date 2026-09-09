import type { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isValidSlug, normalizeSlug } from "@/lib/catalog/slug";

/**
 * Slug-availability check for Step 3. Uses the service-role client
 * deliberately: the session-scoped client (getServerSupabase) is subject to
 * RLS, which restricts `catalogs` reads to rows the caller's own account
 * owns — so it would always report "available" even for a slug some other
 * account already took. Uniqueness is a public fact about the `slug`
 * column, so the same client used for public storefront resolution
 * (src/lib/catalog/resolve.ts) is the right one here too.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slug") ?? "";
  const slug = normalizeSlug(raw);

  if (!slug || !isValidSlug(slug)) {
    return Response.json({ available: false, reason: "invalid" });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ available: false, reason: "error" });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("catalogs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("check-slug: query failed", error);
      return Response.json({ available: false, reason: "error" }, { status: 500 });
    }

    return Response.json({ available: !data, reason: data ? "taken" : undefined, slug });
  } catch (err) {
    console.error("check-slug: unexpected error", err);
    return Response.json({ available: false, reason: "error" }, { status: 500 });
  }
}
