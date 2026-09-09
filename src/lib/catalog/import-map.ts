export const IMPORT_FIELDS = [
  "name",
  "price",
  "description",
  "category",
  "pack",
  "image",
  "code",
  "barcode",
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
};

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function guessField(header: string): ImportFieldOrSkip {
  const key = normalizeHeader(header);
  if (!key) return "skip";
  for (const field of IMPORT_FIELDS) {
    if (HEADER_ALIASES[field].includes(key)) return field;
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

export const IMPORT_ROW_LIMIT = 1000;
