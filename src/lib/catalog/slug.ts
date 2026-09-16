const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const RESERVED = new Set([
  "www",
  "admin",
  "api",
  "app",
  "auth",
  "new",
  "templates",
  "static",
  "assets",
  "mail",
  "edge",
]);

/** Word suffixes tried when the primary slug is taken. */
const WORD_SUFFIXES = ["shop", "store", "co"] as const;

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED.has(slug);
}

/**
 * URL-safe slug from a catalog display name: lowercase, hyphenated,
 * possessive apostrophes collapsed ("Kleaner's" → "kleaners").
 */
export function slugFromName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/['\u2019]s\b/g, "s")
    .replace(/['\u2019]/g, "");
  return normalizeSlug(cleaned).slice(0, 30);
}

function withSuffix(base: string, suffix: string): string {
  const room = 63 - suffix.length - 1;
  return normalizeSlug(`${base.slice(0, Math.max(1, room))}-${suffix}`);
}

/** Stable 3-char suffix so the same taken slug always offers the same alt. */
function shortCode(base: string): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let n = 0;
  for (let i = 0; i < base.length; i++) n = (n * 31 + base.charCodeAt(i)) >>> 0;
  return [0, 1, 2].map((i) => alphabet[(n + i * 17) % alphabet.length]).join("");
}

/**
 * Candidate alternatives when `base` is taken. Extra tokens from the
 * catalog name become location-style suffixes (kleaner + "Doha" → kleaner-doha).
 * Callers must filter against existing slugs; this only proposes valid shapes.
 */
export function suggestSlugCandidates(base: string, name = ""): string[] {
  const out: string[] = [];
  const add = (value: string) => {
    const next = normalizeSlug(value);
    if (next && next !== base && isValidSlug(next) && !out.includes(next)) {
      out.push(next);
    }
  };

  for (let i = 2; i <= 5; i++) add(withSuffix(base, String(i)));

  const nameSlug = slugFromName(name);
  const tokens = nameSlug.split("-").filter(Boolean);
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1] ?? "";
    const first = tokens[0] ?? "";
    add(withSuffix(base, last));
    add(`${first}-${last}`);
    add(tokens.join(""));
  }

  for (const word of WORD_SUFFIXES) add(withSuffix(base, word));
  add(withSuffix(base, shortCode(base)));

  return out;
}
