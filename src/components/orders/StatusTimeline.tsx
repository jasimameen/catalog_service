import { formatOrderDateTime, statusLabel, type OrderStatusDef } from "@/lib/catalog/order-statuses";
import { actorLabel } from "@/lib/catalog/order-tracking";
import type { OrderStatusEventRow } from "@/lib/supabase/types";

export function StatusTimeline({
  events,
  statuses,
}: {
  events: OrderStatusEventRow[];
  statuses: OrderStatusDef[];
}) {
  if (events.length === 0) {
    return <p className="m-0 text-xs text-[#86868b]">No status history yet.</p>;
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {events.map((event) => {
        const from = event.from_status ? statusLabel(statuses, event.from_status) : "—";
        const to = statusLabel(statuses, event.to_status);
        return (
          <li key={event.id} className="text-[13px] text-[var(--cat-ink)]">
            <p className="m-0 font-medium">
              {from} → {to}
            </p>
            <p suppressHydrationWarning className="m-0 mt-0.5 text-xs text-[#86868b]">
              {formatOrderDateTime(event.created_at)} · {actorLabel(event.actor)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
