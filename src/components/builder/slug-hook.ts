import { useEffect, useRef, useState } from "react";
import { isValidSlug, normalizeSlug } from "@/lib/catalog/slug";
import type { SlugAvailability } from "./StepAddress";

interface CheckSlugResponse {
  available: boolean;
  reason?: "invalid" | "taken" | "error";
}

interface RemoteResult {
  slug: string;
  status: SlugAvailability;
}

/**
 * Debounced availability check against src/app/new/api/check-slug, a small
 * route handler (rather than a Server Action) since this is a plain read
 * fired on every keystroke pause — no mutation, no need for the Server
 * Action response envelope.
 *
 * "idle"/"invalid" are derived synchronously from the slug itself (no
 * network round trip needed), so they're computed directly during render
 * rather than via setState-in-an-effect. Only the genuinely async remote
 * lookup ("checking" -> "available"/"taken") goes through state, and every
 * setState for it happens inside a promise callback, never synchronously in
 * the effect body.
 */
export function useSlugAvailability(rawSlug: string, active: boolean): SlugAvailability {
  const slug = normalizeSlug(rawSlug);
  const staticStatus: SlugAvailability | null =
    !active || !slug ? "idle" : !isValidSlug(slug) ? "invalid" : null;

  const [remote, setRemote] = useState<RemoteResult | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (staticStatus !== null) return;

    const thisRequest = ++requestId.current;
    const handle = setTimeout(() => {
      fetch(`/new/api/check-slug?slug=${encodeURIComponent(slug)}`)
        .then((res) => res.json() as Promise<CheckSlugResponse>)
        .then((data) => {
          if (requestId.current !== thisRequest) return; // superseded by a newer keystroke
          const status: SlugAvailability =
            data.reason === "invalid" ? "invalid" : data.available ? "available" : "taken";
          setRemote({ slug, status });
        })
        .catch(() => {
          if (requestId.current === thisRequest) setRemote({ slug, status: "idle" });
        });
    }, 400);

    return () => clearTimeout(handle);
  }, [slug, staticStatus]);

  if (staticStatus !== null) return staticStatus;
  if (remote && remote.slug === slug) return remote.status;
  return "checking";
}
