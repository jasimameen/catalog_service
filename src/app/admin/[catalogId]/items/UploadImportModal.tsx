"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IMPORT_FIELD_LABELS,
  IMPORT_FIELDS,
  type ImportFieldOrSkip,
} from "@/lib/catalog/import-map";
import { applyMapping, defaultMapping, parseCatalogFile, type ParsedSheet } from "./parse-sheet";
import { fileImportItems } from "./actions";

const FIELD_OPTIONS: ImportFieldOrSkip[] = ["skip", ...IMPORT_FIELDS];

export function UploadImportModal({
  catalogId,
  onClose,
}: {
  catalogId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ImportFieldOrSkip[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    error?: string;
    imported?: number;
    updated?: number;
    skipped?: number;
    skipReasons?: string[];
  } | null>(null);

  const mapped = useMemo(() => {
    if (!sheet) return null;
    return applyMapping(sheet.rows, mapping);
  }, [sheet, mapping]);

  const nameMapped = mapping.includes("name");
  const priceMapped = mapping.includes("price");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    setResult(null);
    try {
      const parsed = await parseCatalogFile(file);
      setSheet(parsed);
      setMapping(defaultMapping(parsed.headers));
    } catch (err) {
      setSheet(null);
      setFileError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  function setColumn(index: number, value: ImportFieldOrSkip) {
    setMapping((prev) => {
      const next = [...prev];
      if (value !== "skip") {
        const already = next.indexOf(value);
        if (already >= 0 && already !== index) next[already] = "skip";
      }
      next[index] = value;
      return next;
    });
  }

  function importRows() {
    if (!mapped) return;
    startTransition(async () => {
      const next = await fileImportItems(catalogId, mapped.ready);
      if (!next.error) router.refresh();
      setResult({
        error: next.error,
        imported: next.imported,
        updated: next.updated,
        skipped: (next.skipped ?? 0) + mapped.skipped.length,
        skipReasons: [
          ...mapped.skipped.slice(0, 8).map((s) => `Row ${s.row}: ${s.reason}`),
          ...(next.skipReasons ?? []),
        ].slice(0, 12),
      });
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
        <h3 className="m-0 text-[16px] font-semibold text-[var(--cat-ink)]">Upload catalog</h3>
        <p className="mt-1.5 text-xs text-[var(--cat-muted)]">
          CSV or Excel. Map your columns, then import. Name and price are required.{" "}
          <a href="/catalog-import-template.csv" download className="text-[var(--cat-accent)]">
            Download template
          </a>
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">File</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => void onFile(e.target.files?.[0])}
            className="w-full text-[13px] text-[var(--cat-ink)]"
          />
        </label>
        {fileError ? <p className="m-0 mt-2 text-xs text-[#b2432b]">{fileError}</p> : null}

        {sheet ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="m-0 text-xs text-[var(--cat-muted)]">
              {sheet.rows.length} rows · map each column
            </p>
            <div className="flex flex-col gap-2">
              {sheet.headers.map((header, index) => (
                <label key={`${header}-${index}`} className="grid grid-cols-[1fr_160px] items-center gap-2">
                  <span className="truncate text-[13px] text-[var(--cat-ink)]">{header}</span>
                  <select
                    value={mapping[index] ?? "skip"}
                    onChange={(e) => setColumn(index, e.target.value as ImportFieldOrSkip)}
                    className="rounded-[10px] border border-[#d2d2d7] px-2 py-1.5 text-[13px] outline-none focus:border-[var(--cat-accent)]"
                  >
                    {FIELD_OPTIONS.map((field) => (
                      <option key={field} value={field}>
                        {IMPORT_FIELD_LABELS[field]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {mapped && mapped.ready.length > 0 ? (
              <div className="overflow-hidden rounded-[10px] border border-[#ececf0]">
                <p className="m-0 bg-[#fbfbfd] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
                  Preview
                </p>
                {mapped.ready.slice(0, 4).map((row, i) => (
                  <p key={i} className="m-0 truncate border-t border-[#f0f0f4] px-3 py-1.5 text-xs text-[var(--cat-ink)]">
                    {row.name}
                    {row.category ? ` · ${row.category}` : ""} · {row.price}
                  </p>
                ))}
              </div>
            ) : null}

            {!nameMapped || !priceMapped ? (
              <p className="m-0 text-xs text-[#b2432b]">Map both Name and Price to import.</p>
            ) : null}
          </div>
        ) : null}

        {result?.error ? <p className="m-0 mt-3 text-xs text-[#b2432b]">{result.error}</p> : null}
        {result && !result.error ? (
          <p className="m-0 mt-3 text-xs text-[#1e9e4a]">
            Imported {result.imported ?? 0}, updated {result.updated ?? 0}, skipped {result.skipped ?? 0}.
          </p>
        ) : null}
        {result?.skipReasons?.length ? (
          <ul className="m-0 mt-2 list-disc pl-4 text-xs text-[var(--cat-muted)]">
            {result.skipReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={pending || !mapped || mapped.ready.length === 0 || !nameMapped || !priceMapped}
            onClick={importRows}
            className="flex-1 rounded-[10px] bg-[var(--cat-accent)] py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[10px] border border-[#d2d2d7] bg-white py-2.5 text-[13px] font-medium text-[var(--cat-ink)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
