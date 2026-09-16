import type {
  ImportField,
  ImportFieldDefaults,
  ImportFieldMapping,
  MappedImportRow,
} from "@/lib/catalog/import-map";
import {
  emptyMappedRow,
  fillAutoCodesAndGroups,
  foldVariantRows,
  guessField,
  normalizeHeader,
  parsePrice,
  IMPORT_ROW_LIMIT,
} from "@/lib/catalog/import-map";

export type ParsedSheet = {
  headers: string[];
  rows: string[][];
};

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

export async function parseCatalogFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseExcel(file);
  }
  return parseCsv(file);
}

async function parseCsv(file: File): Promise<ParsedSheet> {
  const Papa = (await import("papaparse")).default;
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: "greedy",
      complete(result) {
        const raw = result.data
          .map((row) => (Array.isArray(row) ? row.map(cellText) : []))
          .filter((row) => row.some((cell) => cell));
        if (raw.length === 0) {
          reject(new Error("That file has no rows."));
          return;
        }
        const headers = raw[0]!.map((cell, i) => cell || `Column ${i + 1}`);
        resolve({ headers, rows: raw.slice(1, IMPORT_ROW_LIMIT + 1) });
      },
      error(err) {
        reject(err);
      },
    });
  });
}

async function parseExcel(file: File): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const first = workbook.SheetNames[0];
  if (!first) throw new Error("That workbook has no sheets.");
  const sheet = workbook.Sheets[first];
  if (!sheet) throw new Error("That workbook has no sheets.");

  const raw = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][])
    .map((row) => row.map(cellText))
    .filter((row) => row.some((cell) => cell));
  if (raw.length === 0) throw new Error("That sheet has no rows.");

  const width = Math.max(...raw.map((r) => r.length));
  const headers = Array.from({ length: width }, (_, i) => raw[0]![i] || `Column ${i + 1}`);
  const rows = raw.slice(1, IMPORT_ROW_LIMIT + 1).map((row) => {
    const padded = [...row];
    while (padded.length < width) padded.push("");
    return padded;
  });
  return { headers, rows };
}

const FIELD_LIMITS: Record<Exclude<ImportField, "price">, number> = {
  name: 200,
  description: 2000,
  category: 80,
  pack: 80,
  image: 2000,
  code: 64,
  barcode: 64,
  variant: 80,
  variantGroup: 64,
};

function pickCell(
  cells: string[],
  col: number | undefined,
  fallback: string | undefined,
  max: number,
): string {
  const mapped = col == null ? "" : (cells[col] ?? "").trim();
  return (mapped || (fallback ?? "").trim()).slice(0, max);
}

export function defaultMapping(headers: string[]): ImportFieldMapping {
  const mapping: ImportFieldMapping = {};
  const ranked = headers.map((header, index) => ({
    index,
    guess: guessField(header),
    score: normalizeHeader(header).length,
  }));
  ranked.sort((a, b) => b.score - a.score);
  for (const { index, guess } of ranked) {
    if (guess === "skip" || mapping[guess] != null) continue;
    mapping[guess] = index;
  }
  return mapping;
}

export function applyMapping(
  rows: string[][],
  mapping: ImportFieldMapping,
  defaults: ImportFieldDefaults = {},
): { ready: MappedImportRow[]; skipped: { row: number; reason: string }[] } {
  const ready: MappedImportRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  rows.forEach((cells, index) => {
    const draft = emptyMappedRow();
    draft.name = pickCell(cells, mapping.name, undefined, FIELD_LIMITS.name);
    draft.description = pickCell(
      cells,
      mapping.description,
      defaults.description,
      FIELD_LIMITS.description,
    );
    draft.category = pickCell(cells, mapping.category, defaults.category, FIELD_LIMITS.category);
    draft.pack = pickCell(cells, mapping.pack, defaults.pack, FIELD_LIMITS.pack);
    draft.image = pickCell(cells, mapping.image, defaults.image, FIELD_LIMITS.image);
    draft.code = pickCell(cells, mapping.code, undefined, FIELD_LIMITS.code);
    draft.barcode = pickCell(cells, mapping.barcode, defaults.barcode, FIELD_LIMITS.barcode);
    draft.variant = pickCell(cells, mapping.variant, defaults.variant, FIELD_LIMITS.variant);
    draft.variantGroup = pickCell(cells, mapping.variantGroup, undefined, FIELD_LIMITS.variantGroup);

    const rowNumber = index + 2;
    if (!draft.name) {
      skipped.push({ row: rowNumber, reason: "missing name" });
      return;
    }
    const price = parsePrice(pickCell(cells, mapping.price, undefined, 40));
    if (price == null) {
      skipped.push({ row: rowNumber, reason: "invalid price" });
      return;
    }
    draft.price = price;
    ready.push(draft);
  });

  return { ready: fillAutoCodesAndGroups(foldVariantRows(ready)), skipped };
}
