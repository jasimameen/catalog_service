"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IMPORT_FIELD_LABELS,
  IMPORT_FIELD_META,
  IMPORT_FIELDS,
  type ImportField,
  type ImportFieldDefaults,
  type ImportFieldMapping,
} from "@/lib/catalog/import-map";
import { applyMapping, defaultMapping, parseCatalogFile, type ParsedSheet } from "./parse-sheet";
import { fileImportItems, type FileImportMode } from "./actions";
import {
  AdminSheet,
  AdminSheetBody,
  AdminSheetFooter,
  AdminSheetHeader,
  btnGhost,
  btnPrimary,
  fieldInput,
} from "./sheet";

export function UploadImportModal({
  catalogId,
  onClose,
  refreshOnSuccess = true,
}: {
  catalogId: string;
  onClose: () => void;
  /** Items page needs a refresh; the create wizard must not remount. */
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ImportFieldMapping>({});
  const [defaults, setDefaults] = useState<ImportFieldDefaults>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<FileImportMode>("upsert");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [fillPlaceholders, setFillPlaceholders] = useState(false);
  const [placeholderKeyword, setPlaceholderKeyword] = useState("");
  const [result, setResult] = useState<{
    error?: string;
    imported?: number;
    updated?: number;
    skipped?: number;
    skipReasons?: string[];
  } | null>(null);

  const mapped = useMemo(() => {
    if (!sheet) return null;
    return applyMapping(sheet.rows, mapping, defaults);
  }, [sheet, mapping, defaults]);

  const nameMapped = mapping.name != null;
  const priceMapped = mapping.price != null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    setResult(null);
    setConfirmReplace(false);
    try {
      const parsed = await parseCatalogFile(file);
      setSheet(parsed);
      setMapping(defaultMapping(parsed.headers));
      setDefaults({});
    } catch (err) {
      setSheet(null);
      setFileError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  function setField(field: ImportField, headerIndex: number | undefined) {
    setMapping((prev) => {
      const next: ImportFieldMapping = { ...prev };
      if (headerIndex == null || !Number.isInteger(headerIndex)) {
        delete next[field];
        return next;
      }
      for (const other of IMPORT_FIELDS) {
        if (other !== field && next[other] === headerIndex) delete next[other];
      }
      next[field] = headerIndex;
      return next;
    });
  }

  function setDefault(field: ImportField, value: string) {
    setDefaults((prev) => {
      const next: ImportFieldDefaults = { ...prev };
      if (!value.trim()) {
        delete next[field];
        return next;
      }
      next[field] = value;
      return next;
    });
  }

  function importRows() {
    if (!mapped) return;
    if (mode === "replace" && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    startTransition(async () => {
      const next = await fileImportItems(catalogId, mapped.ready, {
        mode,
        fillPlaceholders,
        placeholderKeyword,
      });
      if (!next.error && refreshOnSuccess) router.refresh();
      setConfirmReplace(false);
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
    <AdminSheet onClose={onClose} maxWidth="max-w-[720px]" labelledBy="upload-sheet-title">
      <AdminSheetHeader
        id="upload-sheet-title"
        title="Upload catalog"
        helper="CSV or Excel. Match each needed field to a column from your file. Name and price are required. Missing SKUs are generated from the name. Variant rows with the same SKU or name become one item."
        onClose={onClose}
      />
      <AdminSheetBody>
        <div className="flex flex-wrap gap-3.5 text-[13px]">
          <a href="/catalog-import-template.csv" download className="text-[#0b5fce] hover:text-[#0a4aa0]">
            Download template
          </a>
          <span className="text-[#c3ccd9]">·</span>
          <a href="/catalog-dummy.csv" download className="text-[#0b5fce] hover:text-[#0a4aa0]">
            Dummy CSV
          </a>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "upsert", label: "Upsert", hint: "Update matching SKUs. Empty SKUs are generated from the name." },
              { value: "replace", label: "Replace all", hint: "Deletes every current item, then imports this file." },
            ] as const
          ).map((opt) => {
            const selected = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setMode(opt.value);
                  setConfirmReplace(false);
                }}
                className={`min-w-0 flex-1 basis-[230px] rounded-xl border px-3.5 py-3 text-left ${
                  selected ? "border-[#9dc0ef] bg-[#eef4fd]" : "border-[#e2e7ee] bg-[#fbfbfd]"
                }`}
              >
                <span className="block text-[14px] font-medium text-[#101720]">{opt.label}</span>
                <span className="mt-1 block text-[12px] leading-snug text-[#5a6472]">{opt.hint}</span>
              </button>
            );
          })}
        </div>

        {confirmReplace ? (
          <div className="rounded-xl border border-[#f0d3cd] bg-[#fdf1ef] px-3.5 py-2.5 text-[13px] leading-snug text-[#8c2f21]">
            Replace all deletes every current item. Press Import again to confirm.
          </div>
        ) : null}

        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="text-[13px] text-[#101720]"
        />
        {fileError ? <p className="m-0 text-[13px] text-[#b42318]">{fileError}</p> : null}

        <label className="flex min-h-11 items-center gap-2.5 text-[14px] text-[#101720]">
          <input
            type="checkbox"
            checked={fillPlaceholders}
            onChange={(e) => setFillPlaceholders(e.target.checked)}
            className="h-[17px] w-[17px] accent-[#0b5fce]"
          />
          Fill missing images with placeholders
        </label>
        <p className="-mt-2 text-[12px] text-[#8a93a2]">
          Uses a small set of Unsplash photos. Optional keyword picks a matching style.
        </p>
        {fillPlaceholders ? (
          <input
            value={placeholderKeyword}
            onChange={(e) => setPlaceholderKeyword(e.target.value)}
            placeholder="Keyword — coffee, food, product…"
            maxLength={40}
            className={`${fieldInput} max-w-xs`}
          />
        ) : null}

        {sheet ? (
          <>
            <div className="overflow-hidden rounded-xl border border-[#e2e7ee]">
              <div className="hidden gap-2.5 bg-[#fbfbfd] px-3.5 py-2.5 text-[11px] uppercase tracking-[0.07em] text-[#8a93a2] sm:flex">
                <div className="min-w-0 flex-1 basis-[150px]">Needed</div>
                <div className="min-w-0 flex-1 basis-[170px]">Your column</div>
                <div className="w-24 shrink-0">Default</div>
              </div>
              {IMPORT_FIELDS.map((field) => {
                const meta = IMPORT_FIELD_META[field];
                return (
                  <div
                    key={field}
                    className="flex flex-col gap-2.5 border-t border-[#f1f4f8] px-3.5 py-2.5 first:border-t-0 sm:flex-row sm:items-center sm:first:border-t"
                  >
                    <div className="min-w-0 flex-1 basis-[150px]">
                      <p className="m-0 text-[13px] font-medium text-[#101720]">
                        {IMPORT_FIELD_LABELS[field]}
                      </p>
                      <p className={`m-0 text-[11px] ${meta.required ? "text-[#b42318]" : "text-[#8a93a2]"}`}>
                        {meta.required ? "* Required" : meta.autoFill ? meta.autoFill : "Optional"}
                      </p>
                    </div>
                    <select
                      value={mapping[field] == null ? "" : String(mapping[field])}
                      onChange={(e) =>
                        setField(field, e.target.value === "" ? undefined : Number(e.target.value))
                      }
                      className="min-h-10 min-w-0 flex-1 basis-[170px] rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px] outline-none focus:border-[#0b5fce]"
                    >
                      <option value="">Ignore</option>
                      {sheet.headers.map((header, index) => (
                        <option
                          key={`${header}-${index}`}
                          value={index}
                          disabled={
                            Object.entries(mapping).some(
                              ([other, mappedIndex]) => other !== field && mappedIndex === index,
                            )
                          }
                        >
                          {header}
                        </option>
                      ))}
                    </select>
                    {meta.defaultable ? (
                      <input
                        value={defaults[field] ?? ""}
                        onChange={(e) => setDefault(field, e.target.value)}
                        placeholder="If empty"
                        className="min-h-10 w-full rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px] outline-none focus:border-[#0b5fce] sm:w-24 sm:shrink-0"
                      />
                    ) : (
                      <span className="hidden w-24 shrink-0 text-[12px] text-[#8a93a2] sm:block">—</span>
                    )}
                  </div>
                );
              })}
              <div className="px-3.5 py-2 text-[12px] text-[#8a93a2]">
                {sheet.rows.length} rows · needed fields on the left, your file columns on the right
              </div>
            </div>

            {mapped && mapped.ready.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Preview</p>
                {mapped.ready.slice(0, 4).map((row, i) => (
                  <p key={i} className="m-0 font-mono text-[12px] text-[#46505e]">
                    {row.name}
                    {row.category ? ` · ${row.category}` : " · —"} · {row.price}
                    {row.code ? ` · ${row.code}` : ""}
                    {row.options?.[0]?.values.length
                      ? ` · ${row.options[0].values.length} options`
                      : ""}
                  </p>
                ))}
              </div>
            ) : null}

            {!nameMapped || !priceMapped ? (
              <p className="m-0 text-[13px] text-[#b42318]">Map both Name and Price to import.</p>
            ) : null}
          </>
        ) : null}

        {result?.error ? <p className="m-0 text-[13px] text-[#b42318]">{result.error}</p> : null}
        {result && !result.error ? (
          <p className="m-0 text-[13px] text-[#1e9e4a]">
            Imported {result.imported ?? 0}, updated {result.updated ?? 0}, skipped {result.skipped ?? 0}.
          </p>
        ) : null}
        {result?.skipReasons?.length ? (
          <ul className="m-0 list-disc pl-4 text-[12px] text-[#5a6472]">
            {result.skipReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </AdminSheetBody>
      <AdminSheetFooter>
        <button type="button" onClick={onClose} className={btnGhost}>
          Close
        </button>
        <button
          type="button"
          disabled={pending || !mapped || mapped.ready.length === 0 || !nameMapped || !priceMapped}
          onClick={importRows}
          className={btnPrimary}
        >
          {pending ? "Importing…" : confirmReplace ? "Yes, replace all" : "Import"}
        </button>
      </AdminSheetFooter>
    </AdminSheet>
  );
}
