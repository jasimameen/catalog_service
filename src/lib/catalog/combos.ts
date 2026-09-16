import type { CatalogItemRow } from "@/lib/supabase/types";

export const COMBOS_SQL_HINT =
  "Run supabase/combos.sql in the Supabase SQL editor, then try again.";

export type ComboLine = {
  item_id: string;
  qty: number;
};

export type ComboSnapshot = {
  item_id: string;
  code: string;
  name: string;
  qty: number;
};

function asId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asQty(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(99, Math.floor(n)));
}

export function parseComboLines(raw: unknown): ComboLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: ComboLine[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const item_id = asId(obj.item_id);
    const qty = asQty(obj.qty);
    if (!item_id || qty <= 0 || seen.has(item_id)) continue;
    seen.add(item_id);
    lines.push({ item_id, qty });
  }
  return lines;
}

export function parseComboSnapshot(raw: unknown): ComboSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const rows: ComboSnapshot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name.trim().slice(0, 200) : "";
    const qty = asQty(obj.qty);
    if (!name || qty <= 0) continue;
    rows.push({
      item_id: asId(obj.item_id),
      code: typeof obj.code === "string" ? obj.code.trim().slice(0, 64) : "",
      name,
      qty,
    });
  }
  return rows;
}

export function isComboItem(item: { is_combo?: boolean | null } | null | undefined): boolean {
  return item?.is_combo === true;
}

export function formatComboIncludes(lines: { name: string; qty: number }[]): string {
  return lines
    .map((line) => (line.qty > 1 ? `${line.qty}× ${line.name}` : line.name))
    .join(", ");
}

/** Prefer the combo’s own photo; otherwise the first included item that has one. */
export function comboCoverImage(item: {
  image?: string | null;
  comboIncludes?: { image?: string | null }[];
}): string {
  const own = (item.image ?? "").trim();
  if (own) return own;
  for (const line of item.comboIncludes ?? []) {
    const next = (line.image ?? "").trim();
    if (next) return next;
  }
  return "";
}

/** True when the stored description is just the auto “Includes …” line. */
export function isAutoComboDescription(
  description: string,
  lines: { name: string; qty: number }[],
): boolean {
  const text = description.trim();
  if (!text) return false;
  const includes = formatComboIncludes(lines);
  if (!includes) return /^includes\b/i.test(text);
  return text === `Includes ${includes}` || text === includes;
}

export function resolveComboIncludes(
  comboLines: ComboLine[],
  items: Pick<CatalogItemRow, "id" | "code" | "name" | "image">[],
): (ComboSnapshot & { image: string })[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const resolved: (ComboSnapshot & { image: string })[] = [];
  for (const line of comboLines) {
    const item = byId.get(line.item_id);
    if (!item) continue;
    resolved.push({
      item_id: item.id,
      code: item.code,
      name: item.name,
      qty: line.qty,
      image: (item.image ?? "").trim(),
    });
  }
  return resolved;
}

export function parseComboLinesFromForm(raw: unknown): ComboLine[] {
  if (typeof raw === "string") {
    try {
      return parseComboLines(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return parseComboLines(raw);
}

export function osmEmbedUrl(lat: number, lng: number): string {
  const pad = 0.008;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad},${lat - pad},${lng + pad},${lat + pad}&layer=mapnik&marker=${lat},${lng}`;
}

export type ItemThumb = {
  id: string;
  code: string;
  name: string;
  image: string;
};

export function thumbForSku(code: string, thumbs: ItemThumb[]): ItemThumb | null {
  const key = code.trim().toLowerCase();
  if (!key) return null;
  return thumbs.find((row) => row.code.toLowerCase() === key || row.id.toLowerCase() === key) ?? null;
}
