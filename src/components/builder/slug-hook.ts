import { useEffect, useRef, useState } from "react";
import { isValidSlug, normalizeSlug } from "@/lib/catalog/slug";
import type { SlugAvailability } from "./StepAddress";

interface CheckSlugResponse {
  available: boolean;
  reason?: "invalid" | "taken" | "error";
  suggestions?: string[];
}

interface RemoteResult {
  slug: string;
  status: SlugAvailability;
  suggestions: string[];
}

export interface SlugCheck {
  availability: SlugAvailability;
  suggestions: string[];
}

/**
 * Debounced availability check against src/app/new/api/check-slug, a small
 * route handler (rather than a Server Action) since this is a plain read
 * fired on every keystroke pause — no mutation, no need for the Server
 * Action response envelope. Next.js serializes Server Actions per client,
 * so a keystroke check must stay a route handler.
 *
 * "idle"/"invalid" are derived synchronously from the slug itself (no
 * network round trip needed). Only the genuinely async remote lookup
 * ("checking" -> "available"/"taken") goes through state.
 */
export function useSlugAvailability(rawSlug: string, name: string, active: boolean): SlugCheck {
  const slug = normalizeSlug(rawSlug);
  const staticStatus: SlugAvailability | null =
    !active || !slug ? "idle" : !isValidSlug(slug) ? "invalid" : null;

  const [remote, setRemote] = useState<RemoteResult | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (staticStatus !== null) return;

    const thisRequest = ++requestId.current;
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ slug });
      if (name.trim()) params.set("name", name);
      fetch(`/new/api/check-slug?${params.toString()}`)
        .then((res) => res.json() as Promise<CheckSlugResponse>)
        .then((data) => {
          if (requestId.current !== thisRequest) return;
          const status: SlugAvailability =
            data.reason === "invalid"
              ? "invalid"
              : data.reason === "error"
                ? "idle"
                : data.available
                  ? "available"
                  : "taken";
          setRemote({
            slug,
            status,
            suggestions: status === "taken" ? (data.suggestions ?? []) : [],
          });
        })
        .catch(() => {
          if (requestId.current === thisRequest) {
            setRemote({ slug, status: "idle", suggestions: [] });
          }
        });
    }, 300);

    return () => clearTimeout(handle);
  }, [slug, name, staticStatus]);

  if (staticStatus !== null) return { availability: staticStatus, suggestions: [] };
  if (remote && remote.slug === slug) {
    return { availability: remote.status, suggestions: remote.suggestions };
  }
  return { availability: "checking", suggestions: [] };
}
