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
  const [open, setOpen] = useState(false);
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
    <section className="overflow-hidden rounded-[14px] bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="ops-press flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3.5 text-left"
      >
        <span className="text-[13px] font-medium text-[#5a6472]">Status names</span>
        <span className="text-[12px] text-[#86868b]">{open ? "Hide" : "Edit"}</span>
      </button>

      {open ? (
        <div className="flex flex-col gap-[18px] border-t border-[#edf0f4] px-4 py-4">
          <p className="m-0 text-[13px] leading-relaxed text-[#5a6472]">
            New orders start with the default status. Drag or use up/down to order.
          </p>

          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a93a2]">Templates</div>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUS_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="min-h-[38px] cursor-pointer rounded-full border border-[#e2e7ee] bg-[#fbfbfd] px-3.5 text-[13px] text-[var(--cat-ink)] hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)]"
                >
                  {template.label}
                </button>
              ))}
            </div>
            <p className="m-0 text-[12px] text-[#8a93a2]">Start from a common flow, then rename.</p>
          </div>

          <label className="flex max-w-[320px] flex-col gap-1.5 text-[13px] font-medium text-[var(--cat-ink)]">
            Default for new orders
            <select
              value={defaultId}
              onChange={(event) => setDefaultId(event.target.value)}
              className="min-h-11 cursor-pointer rounded-[11px] border border-[#e2e7ee] bg-white px-2.5 text-[14px] font-normal"
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
              const locked = used > 0;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border p-2.5"
                  style={{
                    borderColor: selected ? "#c3d6f2" : "#e2e7ee",
                    background: selected ? "#f7f9fc" : "#fff",
                  }}
                >
                  <input
                    ref={(el) => {
                      inputRefs.current[row.id] = el;
                    }}
                    value={row.label}
                    maxLength={48}
                    onChange={(event) => update(index, { label: event.target.value.slice(0, 48) })}
                    onFocus={() => setSelectedId(row.id)}
                    aria-label={`Label for ${row.id}`}
                    className="min-h-11 min-w-0 flex-1 basis-40 rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[14px]"
                  />
                  <input
                    type="color"
                    value={row.color ?? "#86868b"}
                    onChange={(event) => update(index, { color: event.target.value })}
                    aria-label={`Colour for ${row.label}`}
                    className="h-11 w-11 shrink-0 cursor-pointer rounded-[10px] border border-[#e2e7ee] bg-white p-[3px]"
                  />
                  <label className="flex min-h-11 cursor-pointer items-center gap-[7px] rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px] text-[var(--cat-ink)]">
                    <input
                      type="checkbox"
                      checked={row.is_done}
                      onChange={(event) => update(index, { is_done: event.target.checked })}
                      className="h-4 w-4 accent-[var(--cat-accent)]"
                    />
                    Done
                  </label>
                  <div className="flex flex-1 basis-auto justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                      className="h-11 w-11 cursor-pointer rounded-[10px] border border-[#e2e7ee] bg-white text-[15px] disabled:cursor-default disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1}
                      title="Move down"
                      className="h-11 w-11 cursor-pointer rounded-[10px] border border-[#e2e7ee] bg-white text-[15px] disabled:cursor-default disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={locked}
                      title={locked ? `Used by ${used} ${used === 1 ? "order" : "orders"}` : "Remove status"}
                      className="min-h-11 cursor-pointer rounded-[10px] border border-[#e2e7ee] bg-white px-3 text-[13px] disabled:cursor-default"
                      style={{ color: locked ? "#b0b8c4" : "#b42318" }}
                    >
                      Remove
                    </button>
                  </div>
                  {locked ? (
                    <span className="basis-full text-[12px] text-[#8a93a2]">
                      Used by {used} {used === 1 ? "order" : "orders"}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addStatus()}
                className="min-h-10 cursor-pointer rounded-[10px] border border-dashed border-[#c3ccd9] bg-white px-3.5 text-[13px] hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)]"
              >
                Add status
              </button>
              {EXTRA_STATUS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => addStatus(preset)}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-[7px] rounded-full border border-[#e2e7ee] bg-[#fbfbfd] px-3 text-[13px] hover:border-[#c3ccd9]"
                >
                  {preset.color ? (
                    <span className="h-2 w-2 rounded-full" style={{ background: preset.color }} />
                  ) : null}
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="min-h-11 cursor-pointer rounded-[11px] bg-[var(--cat-accent)] px-[18px] text-[14px] font-medium text-white hover:bg-[var(--cat-accent-dark)] disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save statuses"}
              </button>
              {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
              {message ? <p className="m-0 text-[13px] text-[#1e9e4a]">{message}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
