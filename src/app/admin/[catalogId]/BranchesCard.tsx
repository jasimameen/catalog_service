"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  dashBtnGhost,
  dashBtnPrimary,
  dashCard,
  dashHint,
  dashInput,
  dashLabel,
  dashTextarea,
} from "@/components/admin/dashboard/styles";
import {
  emptyLocation,
  type CatalogLocation,
} from "@/lib/catalog/locations";
import { updateCatalogLocations } from "./actions";

export function BranchesCard({
  catalogId,
  catalogName,
  locations,
  embedded = false,
}: {
  catalogId: string;
  catalogName: string;
  locations: CatalogLocation[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CatalogLocation[]>(locations);
  const [draft, setDraft] = useState<CatalogLocation | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function persist(next: CatalogLocation[]) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateCatalogLocations(catalogId, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRows(next);
      setDraft(null);
      setEditing(null);
      setSaved(true);
      router.refresh();
    });
  }

  function saveDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Give this location a name.");
      return;
    }
    const clean: CatalogLocation = {
      name: name.slice(0, 80),
      phone: draft.phone.trim().slice(0, 40),
      address: draft.address.trim().slice(0, 160),
      website: draft.website.trim().slice(0, 200),
      email: draft.email.trim().slice(0, 120),
      notes: draft.notes.trim().slice(0, 280),
    };
    if (editing != null) {
      persist(rows.map((row, index) => (index === editing ? clean : row)));
      return;
    }
    persist([...rows, clean]);
  }

  function remove(index: number) {
    persist(rows.filter((_, i) => i !== index));
  }

  return (
    <section id={embedded ? undefined : "branches"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Locations</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Branches of {catalogName} only — same menu and link. Another shop is under Advanced.
          </p>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-2 px-4 py-3">
        {embedded ? (
          <p className={`m-0 ${dashHint}`}>
            Locations of this shop. Guests see these on the menu. Another catalog is not a branch.
          </p>
        ) : null}

        {rows.length === 0 && !draft ? (
          <p className="m-0 rounded-[12px] bg-[#f4f6f9] px-3 py-3 text-[13px] leading-snug text-[#5a6472]">
            No locations yet. Add a branch, stall, or pickup point for this shop.
          </p>
        ) : null}

        {rows.map((row, index) => (
          <div
            key={`${row.name}-${index}`}
            className="flex min-w-0 flex-col gap-1 rounded-[12px] border border-[#edf0f4] bg-[#fbfbfd] px-3 py-3"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 truncate text-[14px] font-medium text-[var(--cat-ink)]">{row.name}</p>
                {row.address ? (
                  <p className="m-0 mt-0.5 text-[13px] leading-snug text-[#5a6472]">{row.address}</p>
                ) : null}
                {row.phone ? <p className="m-0 mt-0.5 text-[13px] text-[#5a6472]">{row.phone}</p> : null}
                {row.email ? <p className="m-0 mt-0.5 text-[13px] text-[#5a6472]">{row.email}</p> : null}
                {row.website ? (
                  <p className="m-0 mt-0.5 truncate text-[13px] text-[#0b5fce]">{row.website}</p>
                ) : null}
                {row.notes ? (
                  <p className="m-0 mt-1 text-[12px] leading-snug text-[#86868b]">{row.notes}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSaved(false);
                    setEditing(index);
                    setDraft({ ...row });
                  }}
                  className="ops-press inline-flex min-h-10 items-center text-[13px] font-medium text-[#0b5fce]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(index)}
                  className="ops-press inline-flex min-h-10 items-center text-[13px] text-[#b42318]"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {draft ? (
          <div className="flex min-w-0 flex-col gap-3 rounded-[12px] border border-[#edf0f4] px-3 py-3">
            <LocationFields value={draft} onChange={setDraft} />
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={pending || !draft.name.trim()}
                onClick={saveDraft}
                className={`${dashBtnPrimary} ops-press w-full sm:w-auto`}
              >
                {pending ? "Saving…" : editing != null ? "Save location" : "Add location"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setDraft(null);
                  setEditing(null);
                  setError(null);
                }}
                className={`${dashBtnGhost} ops-press w-full sm:w-auto`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSaved(false);
              setEditing(null);
              setDraft(emptyLocation());
            }}
            className={`${dashBtnGhost} ops-press w-full`}
          >
            Add location
          </button>
        )}

        {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
        {saved ? <p className="m-0 text-[13px] text-[#1e9e4a]">Saved.</p> : null}
      </div>
    </section>
  );
}

function LocationFields({
  value,
  onChange,
}: {
  value: CatalogLocation;
  onChange: (next: CatalogLocation) => void;
}) {
  function set<K extends keyof CatalogLocation>(key: K, next: string) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={dashLabel}>Name</span>
        <input
          value={value.name}
          onChange={(event) => set("name", event.target.value.slice(0, 80))}
          maxLength={80}
          autoFocus
          placeholder="Harbor Downtown"
          className={dashInput}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={dashLabel}>Address</span>
        <input
          value={value.address}
          onChange={(event) => set("address", event.target.value.slice(0, 160))}
          maxLength={160}
          placeholder="Lusail, Doha"
          className={dashInput}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={dashLabel}>Phone</span>
        <input
          value={value.phone}
          onChange={(event) => set("phone", event.target.value.slice(0, 40))}
          maxLength={40}
          inputMode="tel"
          placeholder="+974 3300 0000"
          className={dashInput}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={dashLabel}>Website</span>
        <input
          value={value.website}
          onChange={(event) => set("website", event.target.value.slice(0, 200))}
          maxLength={200}
          inputMode="url"
          placeholder="https://harbor.qa"
          className={dashInput}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={dashLabel}>Email</span>
        <input
          value={value.email}
          onChange={(event) => set("email", event.target.value.slice(0, 120))}
          maxLength={120}
          inputMode="email"
          placeholder="downtown@harbor.qa"
          className={dashInput}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={dashLabel}>Notes</span>
        <textarea
          value={value.notes}
          onChange={(event) => set("notes", event.target.value.slice(0, 280))}
          maxLength={280}
          rows={2}
          placeholder="Valet on the marina side. Closed Fridays."
          className={dashTextarea}
        />
      </label>
    </div>
  );
}
