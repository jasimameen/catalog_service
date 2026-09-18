"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { formatOrderDateTime } from "@/lib/catalog/order-statuses";
import {
  formatReserveDay,
  parseReservationItems,
  reservationItemsCount,
  reservationItemsSummary,
  reservationItemsTotal,
} from "@/lib/catalog/reservation-items";
import {
  merchantReservationActions,
  parseReservationStatus,
  reservationActionLabel,
  reservationStatusTimestamp,
  RESERVATION_STATUS_META,
} from "@/lib/catalog/reservation-status";
import { reservationTablesLabel } from "@/lib/catalog/reservation-tables";
import {
  asCatalogReservation,
  fetchCatalogReservations,
  rowCatalogId,
  rowId,
  useCatalogLiveChannel,
  useLiveRefresh,
} from "@/lib/catalog/live-orders";
import type { ReservationRow, ReservationStatus } from "@/lib/supabase/types";
import { setReservationStatus } from "./reservation-actions";

export function ReservationsInbox({
  catalogId,
  currency,
  initial,
}: {
  catalogId: string;
  currency: string;
  initial: ReservationRow[];
}) {
  const [rows, setRows] = useState(initial.filter((row) => row.catalog_id === catalogId));
  const [openId, setOpenId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const seenIds = useRef(new Set(initial.map((row) => row.id)));
  const hydrated = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCatalogReservations(catalogId);
      const newcomers = next.filter((row) => !seenIds.current.has(row.id));
      if (hydrated.current && newcomers.length > 0) {
        const first = newcomers[0]!;
        setToast(
          newcomers.length === 1
            ? `New booking · ${reservationTablesLabel(first)}`
            : `${newcomers.length} new bookings`,
        );
      }
      for (const row of next) seenIds.current.add(row.id);
      hydrated.current = true;
      setRows(next);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [catalogId]);

  const onRealtime = useCallback(
    (table: "orders" | "service_requests" | "reservations", eventType: string, row: unknown) => {
      if (table !== "reservations") return;
      const cid = rowCatalogId(row);
      if (cid && cid !== catalogId) return;
      if (eventType === "INSERT") {
        const incoming = asCatalogReservation(row, catalogId);
        if (incoming && !seenIds.current.has(incoming.id)) {
          seenIds.current.add(incoming.id);
          setToast(`New booking · ${reservationTablesLabel(incoming)}`);
          setRows((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)]);
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

  const open = openId ? rows.find((row) => row.id === openId) ?? null : null;

  function applyRow(next: ReservationRow) {
    setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-[var(--cat-muted)]">
        Table bookings land here. Food pre-ordered with a booking also shows on Orders as dine-in.
      </p>
      {loadError ? (
        <p className="m-0 rounded-[11px] border border-[#f3d2ce] bg-[#fff5f4] px-3.5 py-2.5 text-[13px] text-[#b42318]">
          Could not refresh bookings. New ones still appear within a few seconds.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--cat-border)] bg-white px-[18px] py-12 text-center text-[14px] text-[var(--cat-muted)]">
          No bookings yet. When a guest reserves a table, it shows up here.
        </div>
      ) : (
        <section className="overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-white">
          {rows.map((row) => (
            <ReservationRowCard
              key={row.id}
              row={row}
              currency={currency}
              selected={openId === row.id}
              onOpen={() => setOpenId(row.id)}
            />
          ))}
        </section>
      )}

      {open ? (
        <ReservationDetail
          row={open}
          catalogId={catalogId}
          currency={currency}
          onClose={() => setOpenId(null)}
          onUpdated={applyRow}
        />
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] max-w-[92vw] -translate-x-1/2">
          <div className="rounded-full bg-[var(--cat-ink)] px-[18px] py-3 text-[13px] text-white shadow-[0_10px_30px_rgba(16,23,32,0.25)]">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: unknown }) {
  const id = parseReservationStatus(status);
  const meta = RESERVATION_STATUS_META[id];
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold text-white" style={{ background: meta.color }}>
      {meta.label}
    </span>
  );
}

function ReservationRowCard({
  row,
  currency,
  selected,
  onOpen,
}: {
  row: ReservationRow;
  currency: string;
  selected: boolean;
  onOpen: () => void;
}) {
  const items = useMemo(() => parseReservationItems(row.items), [row.items]);
  const count = reservationItemsCount(items);
  const total = reservationItemsTotal(items);
  const tables = reservationTablesLabel(row);
  const status = parseReservationStatus(row.status);
  const stamp = reservationStatusTimestamp(row, status);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 border-b border-[#edf0f4] px-3.5 py-3 text-left last:border-b-0"
      style={{ background: selected ? "var(--cat-photo-bg)" : "#fff" }}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="inline-flex h-6 w-fit items-center rounded-full bg-[var(--cat-ink)] px-2 text-[11px] font-semibold text-white">
          {tables}
        </span>
        <StatusPill status={row.status} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-[var(--cat-ink)]">{row.name || "Guest"}</span>
        <span className="mt-0.5 block text-[12px] text-[var(--cat-muted)]">
          {formatReserveDay(String(row.day))} · {row.slot} · {row.guests} {row.guests === 1 ? "guest" : "guests"}
          {row.phone ? ` · ${row.phone}` : ""}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[var(--cat-muted)]">
          {count > 0 ? reservationItemsSummary(items) : "No food yet"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        {count > 0 ? (
          <span className="block text-[13px] font-semibold tabular-nums">{formatMoney(total, currency)}</span>
        ) : null}
        <span suppressHydrationWarning className="block text-[11px] leading-4 text-[var(--cat-muted)]">
          Booked {formatOrderDateTime(row.created_at)}
          {row.confirmed_at ? ` · Confirmed ${formatOrderDateTime(row.confirmed_at)}` : ""}
          {row.cancelled_at ? ` · Cancelled ${formatOrderDateTime(row.cancelled_at)}` : ""}
          {!row.confirmed_at && !row.cancelled_at && stamp && stamp !== row.created_at
            ? ` · ${RESERVATION_STATUS_META[status].timeLabel} ${formatOrderDateTime(stamp)}`
            : ""}
        </span>
      </span>
    </button>
  );
}

function ReservationDetail({
  row,
  catalogId,
  currency,
  onClose,
  onUpdated,
}: {
  row: ReservationRow;
  catalogId: string;
  currency: string;
  onClose: () => void;
  onUpdated: (row: ReservationRow) => void;
}) {
  const items = parseReservationItems(row.items);
  const tables = reservationTablesLabel(row);
  const status = parseReservationStatus(row.status);
  const actions = merchantReservationActions(status);
  const [busy, setBusy] = useState<ReservationStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function changeStatus(next: ReservationStatus) {
    setBusy(next);
    setError("");
    const result = await setReservationStatus(catalogId, row.id, next);
    setBusy(null);
    if (result.error || !result.row) {
      setError(result.error || "Could not update status.");
      return;
    }
    onUpdated(result.row);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end bg-black/40 md:items-stretch" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-detail-title"
        className="flex h-[88%] w-full max-w-none flex-col overflow-y-auto rounded-t-[18px] bg-white md:h-full md:max-w-[420px] md:rounded-none md:border-l md:border-[var(--cat-border)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 border-b border-[#edf0f4] bg-white px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex h-6 items-center rounded-full bg-[var(--cat-ink)] px-2 text-[11px] font-semibold text-white">
                  {tables}
                </span>
                <StatusPill status={row.status} />
              </div>
              <h2 id="reservation-detail-title" className="m-0 text-[18px] font-semibold tracking-tight">
                {row.name || "Guest"}
              </h2>
              <p className="m-0 mt-0.5 text-[13px] text-[var(--cat-muted)]">
                {formatReserveDay(String(row.day))} · {row.slot} · {row.guests} {row.guests === 1 ? "guest" : "guests"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close booking"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border border-[var(--cat-border)] bg-white text-[16px]"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-4 py-4">
          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--cat-muted)]">Times</div>
            <ul className="mt-1.5 list-none p-0 text-[14px]">
              <li>Booked at {formatOrderDateTime(row.created_at)}</li>
              {row.confirmed_at ? <li>Confirmed at {formatOrderDateTime(row.confirmed_at)}</li> : null}
              {row.seated_at ? <li>Seated at {formatOrderDateTime(row.seated_at)}</li> : null}
              {row.completed_at ? <li>Completed at {formatOrderDateTime(row.completed_at)}</li> : null}
              {row.cancelled_at ? <li>Cancelled at {formatOrderDateTime(row.cancelled_at)}</li> : null}
              {row.no_show_at ? <li>No-show at {formatOrderDateTime(row.no_show_at)}</li> : null}
            </ul>
          </section>
          {actions.length > 0 ? (
            <section>
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--cat-muted)]">Update</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {actions.map((next) => (
                  <button
                    key={next}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void changeStatus(next)}
                    className="h-11 rounded-[10px] px-4 text-[13px] font-bold text-white"
                    style={{ background: RESERVATION_STATUS_META[next].color }}
                  >
                    {busy === next ? "Saving…" : reservationActionLabel(next)}
                  </button>
                ))}
              </div>
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            </section>
          ) : null}
          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--cat-muted)]">Guest</div>
            <div className="mt-1 text-[15px]">{row.name || "Guest"}</div>
            {row.phone ? (
              <a href={`tel:${row.phone}`} className="mt-1 block text-[14px] text-[var(--cat-accent)]">
                {row.phone}
              </a>
            ) : null}
          </section>
          {row.note ? (
            <section>
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--cat-muted)]">Request</div>
              <p className="mt-1 whitespace-pre-wrap text-[14px]">{row.note}</p>
            </section>
          ) : null}
          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--cat-muted)]">Pre-ordered food</div>
            {items.length === 0 ? (
              <p className="mt-1 text-[14px] text-[var(--cat-muted)]">No dishes with this booking.</p>
            ) : (
              <ul className="mt-2 flex list-none flex-col gap-2 p-0">
                {items.map((line, index) => (
                  <li key={`${line.code}-${index}`} className="flex items-start justify-between gap-3 text-[14px]">
                    <span>
                      {line.qty}× {line.name}
                      {line.notes ? <span className="block text-[12px] text-[var(--cat-muted)]">{line.notes}</span> : null}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatMoney(line.price * line.qty, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 0 ? (
              <div className="mt-3 flex items-baseline justify-between border-t border-[#edf0f4] pt-3">
                <span className="text-[13px] text-[var(--cat-muted)]">Food total</span>
                <span className="text-[16px] font-semibold tabular-nums">
                  {formatMoney(reservationItemsTotal(items), currency)}
                </span>
              </div>
            ) : null}
            {row.order_id ? (
              <p className="mt-2 text-[12px] text-[var(--cat-muted)]">This food is also on the Orders tab as dine-in.</p>
            ) : null}
          </section>
        </div>
      </aside>
    </div>
  );
}
