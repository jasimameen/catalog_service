export type CatalogLocation = {
  name: string;
  phone: string;
  address: string;
  website: string;
  email: string;
  notes: string;
};

function asText(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function emptyLocation(): CatalogLocation {
  return { name: "", phone: "", address: "", website: "", email: "", notes: "" };
}

export function parseLocationRow(raw: unknown): CatalogLocation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const name = asText(row.name, 80);
  const phone = asText(row.phone, 40);
  const address = asText(row.address, 160);
  const website = asText(row.website, 200);
  const email = asText(row.email, 120);
  const notes = asText(row.notes, 280);
  if (!name && !phone && !address && !website && !email && !notes) return null;
  return {
    name: name || phone || address || website || email,
    phone,
    address,
    website,
    email,
    notes,
  };
}

export function parseLocations(raw: unknown): CatalogLocation[] {
  if (!Array.isArray(raw)) return [];
  const out: CatalogLocation[] = [];
  for (const entry of raw) {
    const row = parseLocationRow(entry);
    if (!row) continue;
    out.push(row);
    if (out.length >= 24) break;
  }
  return out;
}

function splitPipes(line: string): string[] {
  return line
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseLine(line: string): CatalogLocation | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s*[|,–—]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    const looksPhone = /[\d+][\d\s-]{5,}/.test(last);
    if (looksPhone) {
      return { ...emptyLocation(), name: parts.slice(0, -1).join(" "), phone: last };
    }
  }
  const comma = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (comma.length >= 2 && /[\d+][\d\s-]{5,}/.test(comma[comma.length - 1]!)) {
    return {
      ...emptyLocation(),
      name: comma.slice(0, -1).join(", "),
      phone: comma[comma.length - 1]!,
    };
  }
  return { ...emptyLocation(), name: trimmed };
}

/** One location per line: `Lusail, 4414 6262` or `Lusail | 4414 6262`. */
export function parseLocationsFromText(text: string): CatalogLocation[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  if (lines.length === 2 && lines[0]!.includes("|") && lines[1]!.includes("|")) {
    const names = splitPipes(lines[0]!);
    const phones = splitPipes(lines[1]!);
    if (names.length > 1 && names.length === phones.length) {
      return names.map((name, i) => ({ ...emptyLocation(), name, phone: phones[i] ?? "" }));
    }
  }

  if (lines.length === 1 && lines[0]!.includes("|")) {
    return splitPipes(lines[0]!).map((name) => ({ ...emptyLocation(), name }));
  }

  const out: CatalogLocation[] = [];
  for (const line of lines) {
    const row = parseLine(line);
    if (row) out.push(row);
    if (out.length >= 24) break;
  }
  return out;
}

export function locationsToText(locations: CatalogLocation[]): string {
  return locations
    .map((row) => {
      if (row.phone && row.name) return `${row.name}, ${row.phone}`;
      return row.name || row.phone || row.address;
    })
    .filter(Boolean)
    .join("\n");
}

export function resolveLocations(
  stored: unknown,
  addressFallback: string,
): CatalogLocation[] {
  const parsed = parseLocations(stored);
  if (parsed.length > 0) return parsed;
  const text = addressFallback.trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!text.includes("|") && lines.length < 2) return [];
  return parseLocationsFromText(text);
}

export function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || Math.abs(n) > 180) return null;
  return n;
}

export function osmEmbedSrc(lat: number, lng: number): string {
  const pad = 0.012;
  const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function websiteHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
