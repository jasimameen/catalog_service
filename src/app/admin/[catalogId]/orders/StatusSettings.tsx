"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EXTRA_STATUS_PRESETS,
  ORDER_STATUS_TEMPLATES,
  applyStatusTemplate,
  includeStatusesInFilter,
  slugifyStatusId,
  type OrderStatusDef,
  type OrderStatusTemplate,
} from "@/lib/catalog/order-statuses";
import { saveOrderStatuses } from "./actions";

export function StatusSettings({
  catalogId,
  initialStatuses,
  initialDefaultId,
  usedCounts,
}: {
  catalogId: string;
  initialStatuses: OrderStatusDef[];
  initialDefaultId: string;
  usedCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialStatuses);
  const [defaultId, setDefaultId] = useState(initialDefaultId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function focusRow(id: string) {
    setSelectedId(id);
    window.requestAnimationFrame(() => {
      const el = inputRefs.current[id];
      el?.focus();
      el?.select();
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function selectAdded(row: OrderStatusDef, nextRows: OrderStatusDef[]) {
    if (nextRows.length === 1) setDefaultId(row.id);
    includeStatusesInFilter([row.id], [row]);
    focusRow(row.id);
    setError(null);
    setMessage(null);
  }

  function addStatus(preset?: OrderStatusDef) {
    const existing = rows.find((row) =>
      preset ? row.id === preset.id || row.label.toLowerCase() === preset.label.toLowerCase() : false,
    );
    if (existing) {
      includeStatusesInFilter([existing.id], [existing]);
      focusRow(existing.id);
      return;
    }

    const used = new Set(rows.map((row) => row.id));
    const label = preset?.label ?? "New status";
    const id = preset && !used.has(preset.id) ? preset.id : slugifyStatusId(label, used);
    const row: OrderStatusDef = {
      id,
      label,
      sort: rows.length,
      is_done: preset?.is_done === true,
      ...(preset?.color ? { color: preset.color } : {}),
    };
    const next = [...rows, row];
    setRows(next);
    selectAdded(row, next);
  }

  function applyTemplate(template: OrderStatusTemplate) {
    const ok = window.confirm("Replace statuses with this template? In-use statuses are kept.");
    if (!ok) return;
    const next = applyStatusTemplate(template.statuses, rows, usedCounts);
    setRows(next);
    if (next.some((row) => row.id === template.defaultId)) {
      setDefaultId(template.defaultId);
    } else if (!next.some((row) => row.id === defaultId) && next[0]) {
      setDefaultId(next[0].id);
    }
    const visible = next.filter((row) => !row.is_done);
    includeStatusesInFilter(
      visible.map((row) => row.id),
      next,
    );
    const highlight = next.find((row) => row.id === template.defaultId) ?? next[0];
    if (highlight) focusRow(highlight.id);
    setError(null);
    setMessage(`Applied ${template.label}. Save to keep.`);
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= rows.length) return;
    const copy = rows.slice();
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row!);
    setRows(copy.map((item, sort) => ({ ...item, sort })));
  }

  function update(index: number, patch: Partial<OrderStatusDef>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    const row = rows[index];
    if (!row) return;
    const used = usedCounts[row.id] ?? 0;
    if (used > 0) {
      setError(`“${row.label}” is used by ${used} ${used === 1 ? "order" : "orders"}.`);
      return;
    }
    if (rows.length <= 1) {
      setError("Keep at least one status.");
      return;
    }
    const next = rows.filter((_, i) => i !== index).map((item, sort) => ({ ...item, sort }));
    setRows(next);
    if (defaultId === row.id) setDefaultId(next[0]!.id);
    if (selectedId === row.id) setSelectedId(null);
    setError(null);
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveOrderStatuses(catalogId, rows, defaultId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Statuses saved.");
      router.refresh();
    });
  }

  return (
    <details className="rounded-2xl border border-[var(--cat-border)] bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-[var(--cat-ink)]">
        Statuses
      </summary>
      <div className="flex flex-col gap-3 border-t border-[#f0f0f4] px-4 py-4">
        <p className="m-0 text-[13px] text-[var(--cat-muted)]">
          New orders start with the default status. Drag or use up/down to order.
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUS_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="min-h-11 rounded-full border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[var(--cat-ink)]"
              >
                {template.label}
              </button>
            ))}
          </div>
          <p className="m-0 text-xs text-[var(--cat-muted)]">Start from a common flow, then rename.</p>
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-medium text-[var(--cat-ink)] sm:max-w-xs">
          Default for new orders
          <select
            value={defaultId}
            onChange={(event) => setDefaultId(event.target.value)}
            className="min-h-11 rounded-[10px] border border-[#d2d2d7] bg-white px-2.5 text-[13px] font-medium"
          >
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row, index) => {
            const used = usedCounts[row.id] ?? 0;
            const selected = selectedId === row.id;
            return (
              <li
                key={row.id}
                className={`grid gap-2 rounded-[12px] border p-3 sm:grid-cols-[1fr_auto] sm:items-center ${
                  selected ? "border-[var(--cat-ink)] bg-[#f5f5f7]" : "border-[#f0f0f4]"
                }`}
              >
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_40px] sm:items-center">
                  <input
                    ref={(el) => {
                      inputRefs.current[row.id] = el;
                    }}
                    value={row.label}
                    onChange={(event) => update(index, { label: event.target.value })}
                    onFocus={() => setSelectedId(row.id)}
                    aria-label={`Label for ${row.id}`}
                    className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-3 text-[13px]"
                  />
                  <input
                    type="color"
                    value={row.color ?? "#86868b"}
                    onChange={(event) => update(index, { color: event.target.value })}
                    aria-label={`Color for ${row.label}`}
                    className="h-11 w-full cursor-pointer rounded-[10px] border border-[#d2d2d7] bg-white p-1 sm:w-10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-11 items-center gap-2 text-[13px] text-[var(--cat-ink)]">
                    <input
                      type="checkbox"
                      checked={row.is_done}
                      onChange={(event) => update(index, { is_done: event.target.checked })}
                    />
                    Done
                  </label>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="min-h-11 rounded-lg border border-[#d2d2d7] px-3 text-xs font-medium disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    className="min-h-11 rounded-lg border border-[#d2d2d7] px-3 text-xs font-medium disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={used > 0}
                    title={used > 0 ? `Used by ${used} ${used === 1 ? "order" : "orders"}` : "Remove"}
                    className="min-h-11 rounded-lg border border-[#d2d2d7] px-3 text-xs font-medium disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => addStatus()}
            className="min-h-11 rounded-lg border border-[#d2d2d7] bg-white px-3 text-xs font-medium"
          >
            Add status
          </button>
          {EXTRA_STATUS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => addStatus(preset)}
              className="min-h-11 rounded-full border border-[#d2d2d7] bg-white px-3 text-xs font-medium text-[var(--cat-ink)]"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="min-h-11 rounded-lg bg-[var(--cat-ink)] px-3 text-xs font-medium text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save statuses"}
          </button>
          {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
          {message ? <p className="m-0 text-[13px] text-[var(--cat-muted)]">{message}</p> : null}
        </div>
      </div>
    </details>
  );
}
