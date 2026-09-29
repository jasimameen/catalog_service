"use client";

import { useState } from "react";
import Link from "next/link";
import {
  dashBtnGhost,
  dashCard,
} from "@/components/admin/dashboard/styles";
import { SettingsSwitch } from "@/components/admin/SettingsSwitch";
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
        <div className="settings-inset">
          <label className="settings-row cursor-pointer">
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-medium tracking-tight text-[var(--cat-ink)]">
                Floor plan
              </span>
              <span className="mt-0.5 block text-[13px] text-[#86868b]">
                Draw rooms and tables. Reservations work without this.
              </span>
            </span>
            <SettingsSwitch
              checked={on}
              disabled={pending}
              onChange={(next) => void toggle(next)}
            />
          </label>
        </div>
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
