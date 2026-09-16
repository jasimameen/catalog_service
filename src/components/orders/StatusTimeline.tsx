import { formatOrderDateTime, statusById, statusLabel, type OrderStatusDef } from "@/lib/catalog/order-statuses";
import { actorLabel } from "@/lib/catalog/order-tracking";
import type { OrderStatusEventRow } from "@/lib/supabase/types";

const PAST_DOT = "#c3ccd9";
const FALLBACK_COLOR = "#5b8def";

const COLOR_BY_ID: Record<string, string> = {
  new: "#5b8def",
  confirmed: "#0b5fce",
  scheduled: "#0b5fce",
  preparing: "#e3a008",
  packed: "#e3a008",
  in_progress: "#e3a008",
  ready: "#0f9d58",
  collected: "#0f9d58",
  complete: "#0f9d58",
  out_for_delivery: "#7c3aed",
  shipped: "#7c3aed",
  done: "#86868b",
  on_hold: "#c27c0e",
  cancelled: "#b42318",
  refunded: "#6941c6",
};

function eventColor(statuses: OrderStatusDef[], id: string): string {
  const stored = statusById(statuses, id)?.color;
  if (stored && /^#[0-9a-fA-F]{6}$/.test(stored)) return stored;
  return COLOR_BY_ID[id] ?? FALLBACK_COLOR;
}

export function StatusTimeline({
  events,
  statuses,
  showActor = false,
}: {
  events: OrderStatusEventRow[];
  statuses: OrderStatusDef[];
  showActor?: boolean;
}) {
  if (events.length === 0) {
    return <p className="m-0 text-[13px] text-[#8a93a2]">No updates yet.</p>;
  }

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {events.map((event, index) => {
        const label = statusLabel(statuses, event.to_status);
        const last = index === events.length - 1;
        const color = last ? eventColor(statuses, event.to_status) : PAST_DOT;
        return (
          <li key={event.id} className="flex gap-3">
            <span className="flex w-3.5 shrink-0 flex-col items-center" aria-hidden>
              <span className="mt-1.25 h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {!last ? <span className="min-h-3.5 w-px flex-1 bg-[#e2e7ee]" /> : null}
            </span>
            <div className={`min-w-0 ${last ? "pb-0" : "pb-4"}`}>
              <p
                className={`m-0 text-[14px] text-(--cat-ink) ${last ? "font-semibold" : "font-medium"}`}
              >
                {label}
              </p>
              <p suppressHydrationWarning className="m-0 mt-0.5 text-[12px] leading-snug text-[#8a93a2]">
                {formatOrderDateTime(event.created_at)}
                {showActor ? ` · ${actorLabel(event.actor)}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
