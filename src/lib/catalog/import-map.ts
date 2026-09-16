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

/** Collapse one-row-per-size sheets into one item + options. No-op when Variant is unmapped. */
export function foldVariantRows(rows: MappedImportRow[]): MappedImportRow[] {
  const shouldFold = rows.some((row) => row.variant.trim());
  if (!shouldFold) return rows;

  const groups = new Map<string, MappedImportRow[]>();
  const order: string[] = [];
  for (const row of rows) {
    const group = row.variantGroup.trim();
    const key = group
      ? `g:${group.toLowerCase()}`
      : `n:${row.name.trim().toLowerCase()}|${row.category.trim().toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  }

  return order.map((key) => mergeVariantGroup(groups.get(key)!));
}

export const IMPORT_ROW_LIMIT = 1000;
