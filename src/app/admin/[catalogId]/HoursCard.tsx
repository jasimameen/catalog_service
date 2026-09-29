"use client";

import { useActionState, useMemo, useState } from "react";
import {
  dashBtnPrimary,
  dashCard,
  dashHint,
  dashInput,
  dashLabel,
} from "@/components/admin/dashboard/styles";
import { SettingsSwitch } from "@/components/admin/SettingsSwitch";
import {
  WEEK_DAYS,
  formatCatalogHours,
  parseCatalogHours,
  type CatalogDayHours,
  type CatalogHours,
} from "@/lib/catalog/hours";
import { updateCatalogHours, type HoursState } from "./actions";

function daySummary(day: CatalogDayHours): string {
  if (day.closed) return "Closed";
  return `${day.open}–${day.close}`;
}

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
  const [openDay, setOpenDay] = useState<number | null>(null);
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
          <p className="m-0 text-[16px] font-semibold tracking-[-0.02em] text-[var(--cat-ink)]">
            Hours
          </p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Tap a day to edit. Guests see this on the menu.
          </p>
        </div>
      )}

      <form action={formAction} className="flex min-w-0 flex-col">
        <input type="hidden" name="hoursJson" value={JSON.stringify(week)} />
        <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
          <div className="settings-inset">
            <label className="settings-row cursor-pointer">
              <span className="min-w-0 flex-1 text-[16px] font-medium tracking-tight text-[var(--cat-ink)]">
                Show hours on the menu
              </span>
              <SettingsSwitch name="showHours" checked={visible} onChange={setVisible} />
            </label>
            <button
              type="button"
              onClick={copyWeekdays}
              className="settings-row ops-press text-[16px] font-medium text-[#0b5fce]"
            >
              Copy weekdays from Monday
            </button>
          </div>

          <div className="settings-inset">
            {week.days.map((day, index) => {
              const label = WEEK_DAYS[index]?.label ?? day.day;
              const expanded = openDay === index;
              return (
                <div key={day.day}>
                  <button
                    type="button"
                    onClick={() => setOpenDay(expanded ? null : index)}
                    className="settings-row ops-press"
                    aria-expanded={expanded}
                  >
                    <span className="min-w-0 flex-1 text-[16px] font-medium tracking-tight text-[var(--cat-ink)]">
                      {label}
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-[#86868b]">
                      {daySummary(day)}
                    </span>
                    <span aria-hidden className="text-[16px] text-[#c3ccd9]">
                      {expanded ? "▴" : "›"}
                    </span>
                  </button>
                  {expanded ? (
                    <div className="flex min-w-0 flex-col gap-2 px-4 pb-3">
                      <label className="inline-flex min-h-11 cursor-pointer items-center justify-between gap-3 text-[14px] text-[var(--cat-ink)]">
                        Closed
                        <SettingsSwitch
                          checked={day.closed}
                          onChange={(next) => setDay(index, { closed: next })}
                        />
                      </label>
                      {day.closed ? null : (
                        <div className="grid min-w-0 grid-cols-2 gap-2">
                          <label className="flex min-w-0 flex-col gap-1">
                            <span className={dashLabel}>Opens</span>
                            <input
                              type="time"
                              value={day.open}
                              onChange={(event) =>
                                setDay(index, { open: event.target.value || "11:00" })
                              }
                              className={dashInput}
                            />
                          </label>
                          <label className="flex min-w-0 flex-col gap-1">
                            <span className={dashLabel}>Closes</span>
                            <input
                              type="time"
                              value={day.close}
                              onChange={(event) =>
                                setDay(index, { close: event.target.value || "22:00" })
                              }
                              className={dashInput}
                            />
                          </label>
                        </div>
                      )}
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => copyFromPrevious(index)}
                          className="ops-press min-h-11 text-left text-[13px] text-[#0b5fce]"
                        >
                          Same as yesterday
                        </button>
                      ) : null}
                    </div>
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
