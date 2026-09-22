"use client";

import { useCallback, useRef, useState } from "react";
import { formatOrderDateTime } from "@/lib/catalog/order-statuses";
import {
  fetchServiceRequests,
  rowCatalogId,
  rowId,
  useCatalogLiveChannel,
  useLiveRefresh,
} from "@/lib/catalog/live-orders";
import type { ServiceRequestRow } from "@/lib/supabase/types";

function kindLabel(kind: string): string {
  if (kind === "bill") return "Bill";
  if (kind === "waiter") return "Waiter";
  return kind;
}

export function LiveServiceRequests({
  catalogId,
  initial,
}: {
  catalogId: string;
  initial: ServiceRequestRow[];
}) {
  const [rows, setRows] = useState(initial);
  const seenIds = useRef(new Set(initial.map((row) => row.id)));

  const refresh = useCallback(async () => {
    const next = await fetchServiceRequests(catalogId);
    for (const row of next) seenIds.current.add(row.id);
    setRows(next);
  }, [catalogId]);

  const onRow = useCallback(
    (table: "orders" | "service_requests" | "reservations", eventType: string, row: unknown) => {
      if (table !== "service_requests") return;
      const cid = rowCatalogId(row);
      if (cid && cid !== catalogId) return;
      if (eventType === "INSERT" && row && typeof row === "object" && "kind" in row) {
        const next = row as ServiceRequestRow;
        if (next.catalog_id !== catalogId) return;
        if (seenIds.current.has(next.id)) return;
        seenIds.current.add(next.id);
        setRows((prev) => [next, ...prev.filter((item) => item.id !== next.id)].slice(0, 20));
        return;
      }
      if (eventType === "DELETE") {
        const id = rowId(row);
        if (id) setRows((prev) => prev.filter((item) => item.id !== id));
        return;
      }
      void refresh();
    },
    [catalogId, refresh],
  );

  useCatalogLiveChannel(catalogId, ["service_requests"], onRow);
  useLiveRefresh(refresh);

  if (rows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[14px] bg-[#fff8e8]">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#c27c0e]" aria-hidden />
        <h3 className="m-0 text-[13px] font-semibold text-[#8a5a00]">Table needs you</h3>
      </div>
      <ul className="m-0 list-none p-0">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 px-4 py-2 last:pb-3"
          >
            <span className="text-[13px] font-medium text-[#8a5a00]">{kindLabel(row.kind)}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--cat-ink)]">
              {row.table_no ? `Table ${row.table_no}` : "No table"}
              {row.note ? ` · ${row.note}` : ""}
            </span>
            <span suppressHydrationWarning className="shrink-0 text-[12px] text-[#86868b]">
              {formatOrderDateTime(row.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
