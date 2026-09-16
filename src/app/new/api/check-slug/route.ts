import type { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isValidSlug, normalizeSlug, suggestSlugCandidates } from "@/lib/catalog/slug";

/**
 * Slug-availability check for the create wizard. Uses the service-role
 * client deliberately: the session-scoped client (getServerSupabase) is
 * subject to RLS, which restricts `catalogs` reads to rows the caller's
 * own account owns — so it would always report "available" even for a
 * slug some other account already took. Uniqueness is a public fact
 * about the `slug` column, so the same client used for public storefront
 * resolution (src/lib/catalog/resolve.ts) is the right one here too.
 *
 * When the slug is taken, also returns 3–5 alternatives that are not
 * currently in use (increments, name tokens, short suffix).
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slug") ?? "";
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const slug = normalizeSlug(raw);

  if (!slug || !isValidSlug(slug)) {
    return Response.json({ available: false, reason: "invalid", suggestions: [] });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ available: false, reason: "error", suggestions: [] });
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
      return Response.json({ available: false, reason: "error", suggestions: [] }, { status: 500 });
    }

    const taken = Boolean(data);
    const suggestions = taken ? await unusedSuggestions(slug, name) : [];

    return Response.json({
      available: !taken,
      reason: taken ? "taken" : undefined,
      slug,
      suggestions,
    });
  } catch (err) {
    console.error("check-slug: unexpected error", err);
    return Response.json({ available: false, reason: "error", suggestions: [] }, { status: 500 });
  }
}

async function unusedSuggestions(slug: string, name: string): Promise<string[]> {
  const candidates = suggestSlugCandidates(slug, name);
  if (candidates.length === 0) return [];

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("catalogs").select("slug").in("slug", candidates);
    if (error) {
      console.error("check-slug: suggestions query failed", error);
      return candidates.slice(0, 5);
    }
    const used = new Set((data ?? []).map((row) => row.slug));
    return candidates.filter((c) => !used.has(c)).slice(0, 5);
  } catch (err) {
    console.error("check-slug: suggestions unexpected error", err);
    return candidates.slice(0, 5);
  }
}
