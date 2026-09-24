import type { OrderFulfillment } from "@/lib/supabase/types";

export type StorefrontChannel = "menu" | "dine";

export function storefrontMenuPath(host: string): string {
  return `/s/${encodeURIComponent(host)}`;
}

export function storefrontDinePath(host: string, table?: string): string {
  const base = `/s/${encodeURIComponent(host)}/dine`;
  const no = table?.trim();
  return no ? `${base}?table=${encodeURIComponent(no)}` : base;
}

export function storefrontDineTablePath(host: string, code: string): string {
  return `/s/${encodeURIComponent(host)}/dine/t/${encodeURIComponent(code.trim())}`;
}

export function storefrontReservePath(host: string): string {
  return `/s/${encodeURIComponent(host)}/reserve`;
}

export function storefrontTrackPath(host: string, token: string): string {
  return `/s/${encodeURIComponent(host)}/track/${encodeURIComponent(token.trim())}`;
}

/**
 * Guest-facing paths. On a custom domain the browser is at `/dine`, not `/s/{host}/dine`.
 */
export function guestStorefrontPaths(
  slug: string,
  pathname?: string | null,
): {
  menu: string;
  dine: string;
  dineTable: (code: string) => string;
  reserve: string;
  track: (token: string) => string;
} {
  const path = pathname ?? "";
  const onTenantHost = Boolean(path) && !path.startsWith("/s/");
  const base = onTenantHost ? "" : `/s/${encodeURIComponent(slug)}`;
  return {
    menu: base || "/",
    dine: `${base}/dine`,
    dineTable: (code) => `${base}/dine/t/${encodeURIComponent(code.trim())}`,
    reserve: `${base}/reserve`,
    track: (token) => `${base}/track/${encodeURIComponent(token.trim())}`,
  };
}

export function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

export function fulfillmentModesForChannel(
  modes: OrderFulfillment[],
  channel: StorefrontChannel,
): OrderFulfillment[] {
  if (channel === "dine") return modes.filter((mode) => mode === "dine_in");
  if (modes.length === 0) return [];
  return modes.filter((mode) => mode !== "dine_in");
}

/** Retail catalogs (no fulfillment modes) still take orders on the menu URL. */
export function storefrontTakesOrders(
  acceptOrders: boolean,
  modes: OrderFulfillment[],
  channel: StorefrontChannel,
): boolean {
  if (!acceptOrders) return false;
  if (modes.length === 0) return channel === "menu";
  return fulfillmentModesForChannel(modes, channel).length > 0;
}

export function catalogOffersDineIn(modes: OrderFulfillment[]): boolean {
  return modes.includes("dine_in");
}

/** Menu href from a server `/s/[host]` page. Tenant hosts use `/`. */
export function menuHrefForHost(host: string, slug: string): string {
  return host.includes(".") || host.includes(":") ? "/" : storefrontMenuPath(slug);
}
