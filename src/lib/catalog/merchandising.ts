import type { CatalogBanner, ImageFit } from "@/lib/supabase/types";
import type { StorefrontItem } from "./types";

export const MERCHANDISING_SQL_HINT =
  "Run supabase/merchandising.sql in the Supabase SQL editor, then try again.";

export const MAX_BANNERS = 5;

export function parseImageFit(value: unknown, fallback: ImageFit = "cover"): ImageFit {
  return value === "contain" || value === "cover" ? value : fallback;
}

export function parseItemImageFit(value: unknown): ImageFit | null {
  return value === "contain" || value === "cover" ? value : null;
}

export function imageFitClass(fit: ImageFit | undefined): "object-cover" | "object-contain" {
  return fit === "contain" ? "object-contain" : "object-cover";
}

export function isItemAvailable(item: Pick<StorefrontItem, "available">): boolean {
  return item.available !== false;
}

export function parseBanners(value: unknown): CatalogBanner[] {
  if (!Array.isArray(value)) return [];
  const banners: CatalogBanner[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const image = typeof (row as { image?: unknown }).image === "string"
      ? (row as { image: string }).image.trim()
      : "";
    if (!image) continue;
    const alt = typeof (row as { alt?: unknown }).alt === "string"
      ? (row as { alt: string }).alt.trim().slice(0, 120)
      : "";
    banners.push({ image, alt });
    if (banners.length >= MAX_BANNERS) break;
  }
  return banners;
}

export function parseBannersFromForm(raw: FormDataEntryValue | null): CatalogBanner[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    return parseBanners(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function whatsappHref(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

export function instagramHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "").replace(/^instagram\.com\//i, "");
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}

export function telHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function storefrontCategories(items: StorefrontItem[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const item of items) {
    const name = item.category.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    order.push(name);
  }
  return order;
}
