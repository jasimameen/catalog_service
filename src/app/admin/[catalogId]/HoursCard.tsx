"use client";

import { useActionState, useMemo, useState } from "react";
import {
  dashBtnGhost,
  dashBtnPrimary,
  dashCard,
  dashHint,
  dashInput,
  dashLabel,
} from "@/components/admin/dashboard/styles";
import {
  WEEK_DAYS,
  formatCatalogHours,
  parseCatalogHours,
  type CatalogDayHours,
  type CatalogHours,
} from "@/lib/catalog/hours";
import { updateCatalogHours, type HoursState } from "./actions";

export function HoursCard({
  catalogId,
  hours,
  showHours,
  embedded = false,
}: {
  catalogId: string;
  hours: string;
  showHours: boolean;
  embedded?: boolean;
}) {
  const [state, formAction, pending] = useActionState<HoursState, FormData>(
    updateCatalogHours.bind(null, catalogId),
    null,
  );
  const [week, setWeek] = useState<CatalogHours>(() => parseCatalogHours(hours));
  const [visible, setVisible] = useState(showHours);
  const preview = useMemo(() => formatCatalogHours(week), [week]);

  function setDay(index: number, patch: Partial<CatalogDayHours>) {
    setWeek((prev) => ({
      ...prev,
      days: prev.days.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    }));
  }

  function copyFromPrevious(index: number) {
    const previous = week.days[index - 1];
    if (!previous) return;
    setDay(index, { closed: previous.closed, open: previous.open, close: previous.close });
  }

  function copyWeekdays() {
    const monday = week.days[0];
    if (!monday) return;
    setWeek((prev) => ({
      ...prev,
      days: prev.days.map((day, i) =>
        i > 0 && i < 5 ? { ...day, closed: monday.closed, open: monday.open, close: monday.close } : day,
      ),
    }));
  }

  return (
    <section id={embedded ? undefined : "hours"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Hours</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Open and close for each day. Guests see this on the menu.
          </p>
        </div>
      )}

      <form action={formAction} className="flex min-w-0 flex-col">
        <input type="hidden" name="hoursJson" value={JSON.stringify(week)} />
        <div className="flex min-w-0 flex-col gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-[var(--cat-ink)]">
              <input
                type="checkbox"
                name="showHours"
                value="1"
                checked={visible}
                onChange={(event) => setVisible(event.target.checked)}
                className="h-4 w-4 accent-[#0b5fce]"
              />
              Show hours on the menu
            </label>
            <button type="button" onClick={copyWeekdays} className={`${dashBtnGhost} ops-press min-h-10 w-full px-3 text-[12px] sm:w-auto`}>
              Copy weekdays
            </button>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            {week.days.map((day, index) => {
              const label = WEEK_DAYS[index]?.label ?? day.day;
              return (
                <div
                  key={day.day}
                  className="min-w-0 rounded-[12px] border border-[#edf0f4] bg-[#fbfbfd] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="m-0 min-w-0 truncate text-[14px] font-medium text-[var(--cat-ink)]">
                      {label}
                    </p>
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[13px] text-[#5a6472]">
                      <input
                        type="checkbox"
                        checked={day.closed}
                        onChange={(event) => setDay(index, { closed: event.target.checked })}
                        className="h-4 w-4 accent-[#0b5fce]"
                      />
                      Closed
                    </label>
                  </div>

                  {day.closed ? null : (
                    <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={dashLabel}>Opens</span>
                        <input
                          type="time"
                          value={day.open}
                          onChange={(event) => setDay(index, { open: event.target.value || "11:00" })}
                          className={dashInput}
                        />
                      </label>
                      <span className="hidden px-1 text-[13px] text-[#86868b] sm:mt-5 sm:block">–</span>
                      <label className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={dashLabel}>Closes</span>
                        <input
                          type="time"
                          value={day.close}
                          onChange={(event) => setDay(index, { close: event.target.value || "22:00" })}
                          className={dashInput}
                        />
                      </label>
                    </div>
                  )}

                  {index > 0 ? (
                    <button
                      type="button"
                      onClick={() => copyFromPrevious(index)}
                      className="ops-press mt-2 min-h-9 text-left text-[12px] text-[#0b5fce]"
                    >
                      Same as yesterday
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>Extra line</span>
            <input
              value={week.notes}
              onChange={(event) => setWeek((prev) => ({ ...prev, notes: event.target.value.slice(0, 400) }))}
              maxLength={400}
              placeholder="Kitchen closes earlier on holidays"
              className={dashInput}
            />
            <span className={dashHint}>Optional. Shown under the week.</span>
          </label>

          <p className={`m-0 whitespace-pre-line ${dashHint}`}>{preview}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[#edf0f4] px-4 py-3">
          <button type="submit" disabled={pending} className={`${dashBtnPrimary} ops-press`}>
            {pending ? "Saving…" : "Save hours"}
          </button>
          {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
          {state?.saved ? <p className="m-0 text-[13px] text-[#1e9e4a]">Saved.</p> : null}
        </div>
      </form>
    </section>
  );
}
