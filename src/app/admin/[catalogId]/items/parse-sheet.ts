import Papa from "papaparse";
import type { ImportField, ImportFieldOrSkip, MappedImportRow } from "@/lib/catalog/import-map";
import { guessField, parsePrice, IMPORT_ROW_LIMIT } from "@/lib/catalog/import-map";

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

function parseCsv(file: File): Promise<ParsedSheet> {
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

export function defaultMapping(headers: string[]): ImportFieldOrSkip[] {
  const used = new Set<ImportField>();
  return headers.map((header) => {
    const guess = guessField(header);
    if (guess === "skip" || used.has(guess)) return "skip";
    used.add(guess);
    return guess;
  });
}

export function applyMapping(
  rows: string[][],
  mapping: ImportFieldOrSkip[],
): { ready: MappedImportRow[]; skipped: { row: number; reason: string }[] } {
  const ready: MappedImportRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  rows.forEach((cells, index) => {
    const draft: MappedImportRow = {
      name: "",
      price: 0,
      description: "",
      category: "",
      pack: "",
      image: "",
      code: "",
      barcode: "",
    };
    let priceRaw: string | undefined;
    mapping.forEach((field, col) => {
      if (field === "skip") return;
      const value = (cells[col] ?? "").trim();
      if (field === "price") {
        priceRaw = value;
        return;
      }
      if (field === "name") draft.name = value.slice(0, 200);
      else if (field === "description") draft.description = value.slice(0, 2000);
      else if (field === "category") draft.category = value.slice(0, 80);
      else if (field === "pack") draft.pack = value.slice(0, 80);
      else if (field === "image") draft.image = value.slice(0, 2000);
      else if (field === "code") draft.code = value.slice(0, 64);
      else if (field === "barcode") draft.barcode = value.slice(0, 64);
    });

    const rowNumber = index + 2;
    if (!draft.name) {
      skipped.push({ row: rowNumber, reason: "missing name" });
      return;
    }
    const price = parsePrice(priceRaw ?? "");
    if (price == null) {
      skipped.push({ row: rowNumber, reason: "invalid price" });
      return;
    }
    draft.price = price;
    ready.push(draft);
  });

  return { ready, skipped };
}
