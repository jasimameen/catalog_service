"use client";

import { useState } from "react";
import Link from "next/link";
import {
  dashBtnGhost,
  dashCard,
  dashChipOff,
  dashHint,
  dashKicker,
} from "@/components/admin/dashboard/styles";
import { setCatalogFloorPlan } from "./actions";

export function FloorPlanSettings({
  catalogId,
  enabled,
  tableCount,
  coverCount,
  embedded = false,
}: {
  catalogId: string;
  enabled: boolean;
  tableCount: number;
  coverCount: number;
  embedded?: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setOn(next);
    setPending(true);
    setError(null);
    const result = await setCatalogFloorPlan(catalogId, next);
    setPending(false);
    if (result.error) {
      setOn(!next);
      setError(result.error);
      return;
    }
    window.dispatchEvent(new Event("catalog-nav-meta"));
  }

  return (
    <section id={embedded ? undefined : "floor"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">
            Floor plan
          </p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Draw rooms and tables. Reservations work without this.
          </p>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
        <p className={dashKicker}>Floor plan</p>
        <label
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[11px] border px-3.5 text-[13px] has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#eef4fd] ${dashChipOff}`}
        >
          <input
            type="checkbox"
            checked={on}
            disabled={pending}
            onChange={(e) => void toggle(e.target.checked)}
            className="h-4 w-4 accent-[#0b5fce]"
          />
          Floor plan
        </label>
        <p className={dashHint}>Draw rooms and tables. Reservations work without this.</p>
        {on ? (
          <div className="flex flex-wrap items-center gap-3">
            {tableCount > 0 ? (
              <p className="m-0 text-[14px] font-semibold tracking-tight tabular-nums text-[var(--cat-ink)]">
                {tableCount} {tableCount === 1 ? "table" : "tables"} · {coverCount} covers
              </p>
            ) : (
              <p className="m-0 text-[13px] text-[#5a6472]">No rooms yet. Open the studio to draw one.</p>
            )}
            <Link href={`/admin/${catalogId}/floor`} className={dashBtnGhost}>
              {tableCount > 0 ? "Edit floor" : "Open studio"}
            </Link>
          </div>
        ) : null}
        {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
      </div>
    </section>
  );
}
