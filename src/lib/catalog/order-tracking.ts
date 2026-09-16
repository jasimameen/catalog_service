import { getRootDomain } from "@/lib/tenant";

export const DEFAULT_PAUSED_MESSAGE = "We are not taking orders right now.";
export const ORDER_HISTORY_SQL_HINT =
  "Run supabase/order-status-history.sql in the Supabase SQL editor, then try again.";

export function newTrackToken(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out.slice(0, 12);
}

export function pausedOrdersMessage(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 280);
  return DEFAULT_PAUSED_MESSAGE;
}

export function storefrontAlertText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 280);
}

export function trackingUrl(slug: string, token: string, hostname?: string | null): string {
  if (hostname && hostname.trim()) {
    const host = hostname.trim().toLowerCase();
    const root = getRootDomain();
    const scheme = root.includes("localhost") || host.includes("localhost") ? "http" : "https";
    return `${scheme}://${host}/track/${token}`;
  }
  const root = getRootDomain();
  const scheme = root.includes("localhost") ? "http" : "https";
  return `${scheme}://${slug}.${root}/track/${token}`;
}

export function actorLabel(actor: string | null): string {
  if (actor === "merchant") return "Merchant";
  if (actor === "customer") return "Customer";
  if (actor === "system") return "System";
  return "Update";
}
