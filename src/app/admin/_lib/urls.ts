import { getRootDomain } from "@/lib/tenant";

/** Full live storefront URL for a catalog slug, e.g. "https://acme.catalog.hevyf.com". */
export function catalogUrl(slug: string): string {
  const root = getRootDomain();
  const scheme = root.includes("localhost") ? "http" : "https";
  return `${scheme}://${slug}.${root}`;
}

/** Just the host part, e.g. "acme.catalog.hevyf.com" — for display text (no protocol). */
export function catalogHost(slug: string): string {
  return `${slug}.${getRootDomain()}`;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[1]![0]).toUpperCase();
}

/** Simple random SKU-like code for items created from Admin (no code field in the UI). */
export function generateItemCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
