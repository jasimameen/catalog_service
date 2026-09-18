import type { OrderFulfillment } from "@/lib/supabase/types";
import { parseCoord } from "@/lib/catalog/locations";

export const PRESENCE_STORAGE_PREFIX = "catalog-here:";
export const DEFAULT_VENUE_RADIUS_M = 200;

export type PresenceChoice = "here" | "away";

type StoredPresence = {
  v: 1;
  choice: PresenceChoice;
};

function storageKey(catalogId: string): string {
  return `${PRESENCE_STORAGE_PREFIX}${catalogId}`;
}

export function readPresenceChoice(catalogId: string): PresenceChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(catalogId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPresence>;
    if (parsed.v !== 1) return null;
    return parsed.choice === "here" || parsed.choice === "away" ? parsed.choice : null;
  } catch {
    return null;
  }
}

export function writePresenceChoice(catalogId: string, choice: PresenceChoice): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPresence = { v: 1, choice };
    window.sessionStorage.setItem(storageKey(catalogId), JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function clearPresenceChoice(catalogId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(catalogId));
  } catch {
    /* private mode */
  }
}

export function parsePastedCoords(raw: string): { lat: number; lng: number } | null {
  const text = raw.trim().replace(/;/g, ",");
  const parts = text.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = parseCoord(parts[0]);
  const lng = parseCoord(parts[1]);
  if (lat == null || lng == null || Math.abs(lat) > 90) return null;
  return { lat, lng };
}

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function resolveVenueCoords(args: {
  venueLat: number | null;
  venueLng: number | null;
  venueRadiusM: number;
  geoLat: number | null;
  geoLng: number | null;
}): {
  lat: number;
  lng: number;
  radiusM: number;
} | null {
  const venue =
    args.venueLat != null && args.venueLng != null
      ? { lat: args.venueLat, lng: args.venueLng }
      : args.geoLat != null && args.geoLng != null
        ? { lat: args.geoLat, lng: args.geoLng }
        : null;
  if (!venue) return null;
  return {
    lat: venue.lat,
    lng: venue.lng,
    radiusM: args.venueRadiusM || DEFAULT_VENUE_RADIUS_M,
  };
}

export function firstOffPremise(modes: OrderFulfillment[]): OrderFulfillment | null {
  if (modes.includes("pickup")) return "pickup";
  if (modes.includes("delivery")) return "delivery";
  return null;
}

export function visibleModesForPresence(
  modes: OrderFulfillment[],
  presence: "here" | "away" | "qr" | null,
  gatePending: boolean,
): OrderFulfillment[] {
  if (presence === "here" || presence === "qr") {
    return modes.filter((mode) => mode === "dine_in");
  }
  if (presence === "away") {
    return modes.filter((mode) => mode === "pickup" || mode === "delivery");
  }
  if (gatePending) return [];
  return modes;
}
