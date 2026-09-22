"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { reservationTone, RESERVATION_TONE } from "@/lib/catalog/reservation-status";
import {
  formatReserveDay,
  parseReservationItems,
  reservationItemsCount,
} from "@/lib/catalog/reservation-items";
import { parseReservationStatus, RESERVATION_STATUS_META } from "@/lib/catalog/reservation-status";
import { reservationTablesLabel } from "@/lib/catalog/reservation-tables";
import {
  asCatalogReservation,
  fetchCatalogReservations,
  rowCatalogId,
  rowId,
  useCatalogLiveChannel,
  useLiveRefresh,
} from "@/lib/catalog/live-orders";
import type { ReservationRow } from "@/lib/supabase/types";

export function LiveRecentReservations({
  catalogId,
  initial,
}: {
  catalogId: string;
  initial: ReservationRow[];
}) {
  const [rows, setRows] = useState(initial.filter((row) => row.catalog_id === catalogId));
  const [toast, setToast] = useState<string | null>(null);
  const seenIds = useRef(new Set(initial.map((row) => row.id)));
  const hydrated = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCatalogReservations(catalogId, 6);
      const newcomers = next.filter((row) => !seenIds.current.has(row.id));
      if (hydrated.current && newcomers.length > 0) {
        setToast(
          newcomers.length === 1
            ? `New booking · ${reservationTablesLabel(newcomers[0]!)} · ${newcomers[0]!.name || "Guest"}`
            : `${newcomers.length} new bookings`,
        );
      }
      for (const row of next) seenIds.current.add(row.id);
      hydrated.current = true;
      setRows(next);
    } catch {
      // poll retries
    }
  }, [catalogId]);

  const onRealtime = useCallback(
    (table: "orders" | "service_requests" | "reservations", eventType: string, row: unknown) => {
      if (table !== "reservations") return;
      const cid = rowCatalogId(row);
      if (cid && cid !== catalogId) return;
      if (eventType === "INSERT") {
        const incoming = asCatalogReservation(row, catalogId);
        if (incoming) {
          if (!seenIds.current.has(incoming.id)) {
            seenIds.current.add(incoming.id);
            setToast(`New booking · ${reservationTablesLabel(incoming)}`);
          }
          setRows((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)].slice(0, 6));
          return;
        }
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

  useCatalogLiveChannel(catalogId, ["reservations"], onRealtime);
  useLiveRefresh(refresh);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <section className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,23,32,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-[18px]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--cat-ink)] opacity-30" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--cat-ink)]" />
          </span>
          <h3 className="m-0 text-[15px] font-semibold tracking-tight text-[var(--cat-ink)]">
            Reservations
          </h3>
        </div>
        <Link
          href={`/admin/${catalogId}/orders?inbox=reservations`}
          className="ops-press min-h-11 text-[13px] leading-[44px] text-[#0b5fce]"
        >
          Open
        </Link>
      </div>
      {toast ? (
        <p className="mx-4 mt-3 rounded-[11px] bg-[var(--cat-ink)] px-3 py-2 text-[13px] font-medium text-white sm:mx-[18px]">
          {toast}
        </p>
      ) : null}
      <div className="flex flex-col">
        {rows.length === 0 ? (
          <p className="px-4 py-9 text-center text-[13px] leading-relaxed text-[#8a93a2] sm:px-[18px]">
            No bookings yet. A reserved table will show up here.
          </p>
        ) : (
          rows.map((row) => {
            const count = reservationItemsCount(parseReservationItems(row.items));
            const status = parseReservationStatus(row.status);
            const tone = RESERVATION_TONE[reservationTone(status)];
            return (
              <Link
                key={row.id}
                href={`/admin/${catalogId}/orders?inbox=reservations`}
                className="ops-press flex min-h-11 items-center gap-3 px-4 py-3 text-[var(--cat-ink)] no-underline last:pb-4 hover:bg-[#fafbfd] sm:px-[18px]"
              >
                <span className="w-[4.25rem] shrink-0 text-[17px] font-semibold tracking-[-0.02em] tabular-nums">
                  {row.slot}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold tracking-tight">{row.name || "Guest"}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[#86868b]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.ink }} />
                      {RESERVATION_STATUS_META[status].label}
                    </span>
                    <span>
                      {row.guests} {row.guests === 1 ? "guest" : "guests"}
                      {reservationTablesLabel(row) !== "No preference" ? ` · ${reservationTablesLabel(row)}` : ""}
                      {count > 0 ? ` · ${count} dishes` : ""}
                    </span>
                  </span>
                </span>
                <span className="hidden shrink-0 text-[12px] text-[#86868b] sm:inline">
                  {formatReserveDay(String(row.day))}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
