"use client";

import { useState } from "react";
import type { SetupInquiryFile, SetupInquiryRow, SetupInquiryStatus } from "@/lib/supabase/types";
import { signedInquiryFileUrl, updateInquiryStatus } from "./actions";

const STATUSES: { id: SetupInquiryStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "live", label: "Live" },
  { id: "closed", label: "Closed" },
];

function filesOf(raw: SetupInquiryRow["files"]): SetupInquiryFile[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is SetupInquiryFile => Boolean(row && typeof row === "object" && "path" in row));
}

export function InquiryInbox({ inquiries }: { inquiries: SetupInquiryRow[] }) {
  const [filter, setFilter] = useState<SetupInquiryStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(inquiries[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = filter === "all" ? inquiries : inquiries.filter((row) => row.status === filter);

  async function setStatus(id: string, status: SetupInquiryStatus) {
    setBusy(id);
    await updateInquiryStatus(id, status);
    setBusy(null);
  }

  async function openFile(path: string) {
    const url = await signedInquiryFileUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        {STATUSES.map((status) => (
          <FilterChip
            key={status.id}
            label={status.label}
            active={filter === status.id}
            onClick={() => setFilter(status.id)}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[14px] border border-[var(--cat-border)] bg-white p-5 text-[14px] text-[var(--cat-muted)]">
          No inquiries in this status.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const open = openId === row.id;
            const files = filesOf(row.files);
            return (
              <li key={row.id} className="overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--cat-ink)]">{row.business_name}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">
                      {row.country || "—"} · {row.business_type}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--cat-bg)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--cat-muted)]">
                    {STATUSES.find((s) => s.id === row.status)?.label ?? row.status}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-[var(--cat-border)] px-4 py-4 text-[13px] leading-relaxed">
                    <p>
                      <strong>Email</strong> {row.email}
                    </p>
                    <p>
                      <strong>Phone</strong> {row.phone || "—"} · <strong>WhatsApp</strong> {row.whatsapp || "—"}
                    </p>
                    <p>
                      <strong>Website</strong> {row.website || "—"}
                    </p>
                    {row.notes ? <p className="mt-3 whitespace-pre-wrap">{row.notes}</p> : null}
                    {files.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {files.map((file) => (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => void openFile(file.path)}
                            className="rounded-full border border-[var(--cat-border)] px-3 py-1.5 text-[12px]"
                          >
                            {file.kind}: {file.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {STATUSES.map((status) => (
                        <button
                          key={status.id}
                          type="button"
                          disabled={busy === row.id || row.status === status.id}
                          onClick={() => void setStatus(row.id, status.id)}
                          className="min-h-10 rounded-[10px] border border-[var(--cat-border)] px-3 text-[12px] font-medium disabled:opacity-50"
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3.5 text-[13px] ${
        active ? "border-[var(--cat-ink)] bg-[var(--cat-ink)] text-white" : "border-[var(--cat-border)] bg-white"
      }`}
    >
      {label}
    </button>
  );
}
