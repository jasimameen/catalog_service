export type SavedGuestAddress = {
  address: string;
  maps: string;
  lat: number | null;
  lng: number | null;
};

function digits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-15);
}

function storageKey(catalogId: string, phone: string): string | null {
  const d = digits(phone);
  if (d.length < 6) return null;
  return `catalog-addr:${catalogId}:${d}`;
}

export function loadGuestAddress(catalogId: string, phone: string): SavedGuestAddress | null {
  if (typeof window === "undefined") return null;
  const key = storageKey(catalogId, phone);
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGuestAddress>;
    return {
      address: typeof parsed.address === "string" ? parsed.address : "",
      maps: typeof parsed.maps === "string" ? parsed.maps : "",
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
    };
  } catch {
    return null;
  }
}

export function saveGuestAddress(
  catalogId: string,
  phone: string,
  address: SavedGuestAddress,
): void {
  if (typeof window === "undefined") return;
  const key = storageKey(catalogId, phone);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(address));
  } catch {
    // ignore quota / private mode
  }
}

export function mapsUrlFromCoords(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}
