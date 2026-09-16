import type { ItemOptionGroup } from "@/lib/supabase/types";

export const IMPORT_FIELDS = [
  "name",
  "price",
  "description",
  "category",
  "pack",
  "image",
  "code",
  "barcode",
  "variant",
  "variantGroup",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export type ImportFieldOrSkip = ImportField | "skip";

/** Needed catalog field → column index in the dropped file. Missing = Ignore. */
export type ImportFieldMapping = Partial<Record<ImportField, number>>;

/** Fallback when a mapped cell is empty or the field is unmapped. */
export type ImportFieldDefaults = Partial<Record<ImportField, string>>;

export type ImportFieldMeta = {
  required: boolean;
  defaultable: boolean;
  autoFill?: string;
};

export const IMPORT_FIELD_META: Record<ImportField, ImportFieldMeta> = {
  name: { required: true, defaultable: false },
  price: { required: true, defaultable: false },
  description: { required: false, defaultable: true },
  category: { required: false, defaultable: true },
  pack: { required: false, defaultable: true },
  image: { required: false, defaultable: true },
  code: { required: false, defaultable: false, autoFill: "Filled automatically if empty" },
  barcode: { required: false, defaultable: true },
  variant: { required: false, defaultable: true },
  variantGroup: { required: false, defaultable: false, autoFill: "Filled automatically if empty" },
};

export type MappedImportRow = {
  name: string;
  price: number;
  description: string;
  category: string;
  pack: string;
  image: string;
  code: string;
  barcode: string;
  variant: string;
  variantGroup: string;
  options: ItemOptionGroup[];
};

export const IMPORT_FIELD_LABELS: Record<ImportFieldOrSkip, string> = {
  skip: "Skip",
  name: "Name",
  price: "Price",
  description: "Description",
  category: "Category",
  pack: "Pack",
  image: "Image URL",
  code: "Code / SKU",
  barcode: "Barcode",
  variant: "Variant / Size",
  variantGroup: "Variant group",
};

const HEADER_ALIASES: Record<ImportField, string[]> = {
  name: ["name", "product", "item", "title", "product name", "item name"],
  price: ["price", "unit price", "cost", "amount", "unitprice"],
  description: ["description", "desc", "details", "detail"],
  category: ["category", "cat", "dept", "department", "group"],
  pack: ["pack", "packing", "unit", "size"],
  image: ["image", "photo", "url", "image url", "picture", "imageurl"],
  code: ["code", "sku", "item code", "product code", "itemcode"],
  barcode: ["barcode", "ean", "upc"],
  variant: ["variant", "option", "flavour", "flavor"],
  variantGroup: [
    "variant group",
    "variant group id",
    "variant groupid",
    "group id",
    "groupid",
  ],
};

const SIZE_LIKE = new Set([
  "s",
  "m",
  "l",
  "xl",
  "regular",
  "small",
  "medium",
  "large",
  "half",
  "full",
]);

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function guessField(header: string): ImportFieldOrSkip {
  const key = normalizeHeader(header);
  if (!key) return "skip";
  const stripped = key.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  for (const field of IMPORT_FIELDS) {
    if (HEADER_ALIASES[field].includes(key) || HEADER_ALIASES[field].includes(stripped)) {
      return field;
    }
  }
  return "skip";
}

export function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 0 ? null : Math.round(raw * 100) / 100;
  }
  const text = String(raw ?? "")
    .trim()
    .replace(/[^0-9.,-]/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (!text) return null;
  const value = Number(text);
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function emptyMappedRow(): MappedImportRow {
  return {
    name: "",
    price: 0,
    description: "",
    category: "",
    pack: "",
    image: "",
    code: "",
    barcode: "",
    variant: "",
    variantGroup: "",
    options: [],
  };
}

function firstFilled(rows: MappedImportRow[], key: keyof MappedImportRow): string {
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function optionGroupName(variants: string[]): string {
  if (variants.length > 0 && variants.every((name) => SIZE_LIKE.has(name.trim().toLowerCase()))) {
    return "Size";
  }
  return "Option";
}

function mergeVariantGroup(rows: MappedImportRow[]): MappedImportRow {
  const first = rows[0]!;
  const named = rows.filter((row) => row.variant.trim());
  const codes = [...new Set(rows.map((row) => row.code.trim()).filter(Boolean))];
  const groupCode = firstFilled(rows, "variantGroup");
  const prices = rows.map((row) => row.price);
  const base = Math.min(...prices);
  const uniqueVariants: { name: string; price: number }[] = [];
  for (const row of named.length ? named : rows) {
    const name = row.variant.trim() || "Regular";
    if (uniqueVariants.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) continue;
    uniqueVariants.push({ name, price: row.price });
  }

  const options: ItemOptionGroup[] =
    uniqueVariants.length >= 2
      ? [
          {
            name: optionGroupName(uniqueVariants.map((entry) => entry.name)),
            type: "single",
            required: true,
            values: uniqueVariants.map((entry) => ({
              name: entry.name,
              price_delta: Math.round((entry.price - base) * 100) / 100,
            })),
          },
        ]
      : [];

  return {
    name: first.name,
    price: base,
    description: firstFilled(rows, "description"),
    category: first.category,
    pack: firstFilled(rows, "pack"),
    image: firstFilled(rows, "image"),
    code: groupCode || (codes.length === 1 ? codes[0]! : ""),
    barcode: firstFilled(rows, "barcode"),
    variant: "",
    variantGroup: groupCode,
    options,
  };
}

/** Collapse one-row-per-size sheets into one item + options. */
export function foldVariantRows(rows: MappedImportRow[]): MappedImportRow[] {
  const codeCounts = new Map<string, number>();
  for (const row of rows) {
    const code = row.code.trim().toLowerCase();
    if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  const shouldFold =
    rows.some((row) => row.variant.trim() || row.variantGroup.trim()) ||
    [...codeCounts.values()].some((count) => count > 1);
  if (!shouldFold) return rows;

  const groups = new Map<string, MappedImportRow[]>();
  const order: string[] = [];
  for (const row of rows) {
    const group = row.variantGroup.trim();
    const code = row.code.trim();
    const key = group
      ? `g:${group.toLowerCase()}`
      : code
        ? `c:${code.toLowerCase()}`
        : `n:${row.name.trim().toLowerCase()}|${row.category.trim().toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  }

  return order.map((key) => mergeVariantGroup(groups.get(key)!));
}

function slugForSku(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || "item";
}

function shortSuffix(name: string): string {
  let hash = 2166136261;
  const input = name.trim().toLowerCase();
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 4);
}

/** Stable SKU from a name slug + short suffix. Unique within `used`. */
export function skuFromName(name: string, used: Set<string>): string {
  const base = slugForSku(name);
  const suffix = shortSuffix(name);
  let candidate = `${base}-${suffix}`.slice(0, 64);
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}-${n}`.slice(0, 64);
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function groupIdFromName(name: string, used: Set<string>): string {
  const base = `vg-${slugForSku(name)}`.slice(0, 56);
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-${n}`.slice(0, 64);
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/** Fill missing SKUs and variant-group ids after rows are mapped / folded. */
export function fillAutoCodesAndGroups(rows: MappedImportRow[]): MappedImportRow[] {
  const usedCodes = new Set<string>();
  const usedGroups = new Set<string>();
  for (const row of rows) {
    const code = row.code.trim();
    if (code) usedCodes.add(code.toLowerCase());
    const group = row.variantGroup.trim();
    if (group) usedGroups.add(group.toLowerCase());
  }
  return rows.map((row) => {
    const code = row.code.trim() || skuFromName(row.name, usedCodes);
    const hasVariants = row.options.length > 0;
    const variantGroup =
      row.variantGroup.trim() || (hasVariants ? groupIdFromName(row.name, usedGroups) : "");
    return { ...row, code, variantGroup };
  });
}

export const IMPORT_ROW_LIMIT = 1000;
