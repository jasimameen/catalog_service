"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { formatOrderDateTime } from "@/lib/catalog/order-statuses";
import {
  formatReserveDay,
  localDayIso,
  parseReservationItems,
  reservationItemsCount,
  reservationItemsSummary,
  reservationItemsTotal,
} from "@/lib/catalog/reservation-items";
import { ticketSurface } from "@/lib/catalog/order-identity";
import {
  merchantReservationActions,
  nextReservationAction,
  parseReservationStatus,
  reservationActionLabel,
  reservationRailActionLabel,
  reservationRailRows,
  reservationTone,
  RESERVATION_STATUS_META,
  RESERVATION_TONE,
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
import {
  OPEN_INCOMING_TICKET_EVENT,
  type OpenIncomingTicketDetail,
} from "@/lib/catalog/incoming-ticket";
import type { ReservationRow, ReservationStatus } from "@/lib/supabase/types";
import { setReservationStatus } from "./reservation-actions";
import { OpsGhostButton, OpsPrimaryButton, OpsSegment, OpsSegmented } from "@/components/admin/ops/OpsChrome";
import { TypeMark } from "@/components/orders/FulfillmentTypeBadge";

type Scope = "booked" | "seated" | "all";

export function ReservationsInbox({
  catalogId,
  currency,
  initial,
  initialOpenId = null,
}: {
  catalogId: string;
  currency: string;
  initial: ReservationRow[];
  initialOpenId?: string | null;
}) {
  const [rows, setRows] = useState(initial.filter((row) => row.catalog_id === catalogId));
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [scope, setScope] = useState<Scope>("booked");
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCatalogReservations(catalogId);
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
        if (incoming) {
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
    function onOpenTicket(event: Event) {
      const detail = (event as CustomEvent<OpenIncomingTicketDetail>).detail;
      if (!detail || detail.catalogId !== catalogId || detail.kind !== "reservation") return;
      setOpenId(detail.id);
    }
    window.addEventListener(OPEN_INCOMING_TICKET_EVENT, onOpenTicket);
    return () => window.removeEventListener(OPEN_INCOMING_TICKET_EVENT, onOpenTicket);
  }, [catalogId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const open = openId ? rows.find((row) => row.id === openId) ?? null : null;

  function applyRow(next: ReservationRow) {
    setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)));
  }

  const bookedCount = rows.filter((row) => reservationTone(row.status) === "booked").length;
  const seatedCount = rows.filter((row) => reservationTone(row.status) === "seated").length;
  const visible = rows.filter((row) => {
    const tone = reservationTone(row.status);
    if (scope === "booked") return tone === "booked";
    if (scope === "seated") return tone === "seated";
    return true;
  });

  async function bump(row: ReservationRow) {
    const next = nextReservationAction(row.status);
    if (!next) return;
    const result = await setReservationStatus(catalogId, row.id, next);
    if (result.error || !result.row) {
      setToast(result.error || "Could not update booking.");
      return;
    }
    applyRow(result.row);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="ops-glass relative z-[4] -mx-4 px-4 py-2.5 md:sticky md:top-[3.6rem]">
        <div className="ops-edge" aria-hidden />
        <OpsSegmented label="Bookings to show">
          <OpsSegment selected={scope === "booked"} onClick={() => setScope("booked")}>
            Booked{bookedCount > 0 ? ` ${bookedCount}` : ""}
          </OpsSegment>
          <OpsSegment selected={scope === "seated"} onClick={() => setScope("seated")}>
            Seated{seatedCount > 0 ? ` ${seatedCount}` : ""}
          </OpsSegment>
          <OpsSegment selected={scope === "all"} onClick={() => setScope("all")}>
            All
          </OpsSegment>
        </OpsSegmented>
        <p className="m-0 mt-2 text-[12px] text-[#86868b]">
          Time, name, party. Food pre-ordered with a booking also shows on Orders.
        </p>
      </div>
      {loadError ? (
        <p className="m-0 rounded-[11px] bg-[#fff5f4] px-3.5 py-2.5 text-[13px] text-[#b42318]">
          Could not refresh bookings. New ones still appear within a few seconds.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-[16px] bg-white px-[18px] py-12 text-center text-[14px] text-[#86868b]">
          {rows.length === 0
            ? "No bookings yet. When a guest reserves a table, it shows up here."
            : scope === "booked"
              ? "No booked tables waiting."
              : scope === "seated"
                ? "No one seated right now."
                : "Nothing here."}
        </div>
      ) : (
        <section className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,23,32,0.04)]">
          {visible.map((row) => (
            <ReservationRowCard
              key={row.id}
              row={row}
              currency={currency}
              selected={openId === row.id}
              onOpen={() => setOpenId(row.id)}
              onNext={() => void bump(row)}
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

function StatusCue({ status }: { status: unknown }) {
  const id = parseReservationStatus(status);
  const tone = RESERVATION_TONE[reservationTone(id)];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#5a6472]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone.ink }} aria-hidden />
      {RESERVATION_STATUS_META[id].label}
    </span>
  );
}

function ReservationRowCard({
  row,
  currency,
  selected,
  onOpen,
  onNext,
}: {
  row: ReservationRow;
  currency: string;
  selected: boolean;
  onOpen: () => void;
  onNext: () => void;
}) {
  const items = useMemo(() => parseReservationItems(row.items), [row.items]);
  const count = reservationItemsCount(items);
  const total = reservationItemsTotal(items);
  const tables = reservationTablesLabel(row);
  const tone = reservationTone(row.status);
  const wash = RESERVATION_TONE[tone].wash;
  const next = nextReservationAction(row.status);

  return (
    <div
      className="ops-press flex w-full items-center gap-3 px-4 py-3 text-left"
      style={{ background: selected ? wash : "#fff" }}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="mt-0.5 shrink-0 text-[var(--cat-accent)]" aria-hidden>
          <TypeMark kind="reservation" size={16} />
        </span>
        <span className="w-[4.5rem] shrink-0">
          <span className="block text-[1.25rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--cat-ink)]">
            {row.slot}
          </span>
          <span className="mt-1 block text-[11px] text-[#86868b]">{formatReserveDay(String(row.day))}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-tight text-[var(--cat-ink)]">
            {row.name || "Guest"}
          </span>
          <span className="mt-0.5 block text-[12px] text-[#5a6472]">
            {row.guests} {row.guests === 1 ? "guest" : "guests"}
            {tables !== "No preference" ? ` · ${tables}` : ""}
            {row.phone ? ` · ${row.phone}` : ""}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2">
            <StatusCue status={row.status} />
            <span className="truncate text-[12px] text-[#86868b]">
              {count > 0 ? reservationItemsSummary(items) : "No food yet"}
            </span>
          </span>
        </span>
        {count > 0 ? (
          <span className="hidden shrink-0 text-[13px] font-semibold tabular-nums sm:block">
            {formatMoney(total, currency)}
          </span>
        ) : null}
      </button>
      <span className="w-[6.75rem] shrink-0" onClick={(event) => event.stopPropagation()}>
        {next ? (
          <OpsPrimaryButton onClick={onNext} className="w-full">
            {reservationActionLabel(next)}
          </OpsPrimaryButton>
        ) : (
          <span className="inline-flex w-full items-center justify-center gap-1 text-[12px] text-[#86868b]">
            <TypeMark kind="done" size={13} />
            {RESERVATION_TONE[tone].label}
          </span>
        )}
      </span>
    </div>
  );
}

export function ReservationsBoardRail({
  catalogId,
  currency,
  initial,
  initialOpenId = null,
  variant = "column",
}: {
  catalogId: string;
  currency: string;
  initial: ReservationRow[];
  initialOpenId?: string | null;
  variant?: "column" | "strip";
}) {
  const [rows, setRows] = useState(initial.filter((row) => row.catalog_id === catalogId));
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const today = localDayIso();

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCatalogReservations(catalogId);
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
        if (incoming) {
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
    function onOpenTicket(event: Event) {
      const detail = (event as CustomEvent<OpenIncomingTicketDetail>).detail;
      if (!detail || detail.catalogId !== catalogId || detail.kind !== "reservation") return;
      setOpenId(detail.id);
    }
    window.addEventListener(OPEN_INCOMING_TICKET_EVENT, onOpenTicket);
    return () => window.removeEventListener(OPEN_INCOMING_TICKET_EVENT, onOpenTicket);
  }, [catalogId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const open = openId ? rows.find((row) => row.id === openId) ?? null : null;
  const visible = useMemo(() => reservationRailRows(rows, today), [rows, today]);

  function applyRow(next: ReservationRow) {
    setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)));
  }

  async function setStatus(row: ReservationRow, next: ReservationStatus) {
    const result = await setReservationStatus(catalogId, row.id, next);
    if (result.error || !result.row) {
      setToast(result.error || "Could not update booking.");
      return;
    }
    applyRow(result.row);
  }

  const cards = (
    <>
      {visible.map((row) => (
        <ReservationTicketCard
          key={row.id}
          row={row}
          currency={currency}
          selected={openId === row.id}
          onOpen={() => setOpenId(row.id)}
          onStatus={(next) => void setStatus(row, next)}
        />
      ))}
      {visible.length === 0 ? (
        <div className="px-2 py-[22px] text-center text-[12px] text-[#a3abb8]">
          {loadError ? "Could not refresh bookings." : "No bookings today"}
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {variant === "column" ? (
        <section className="max-w-[360px] min-w-[264px] flex-[0.92] snap-start overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,23,32,0.04)]">
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <span className="text-[var(--cat-accent)]" aria-hidden>
              <TypeMark kind="reservation" size={15} />
            </span>
            <span className="min-w-0 flex-1 text-[14px] font-semibold tracking-tight">Reservations</span>
            <span className="text-[13px] tabular-nums text-[#86868b]">{visible.length}</span>
          </div>
          <div className="flex min-h-[88px] flex-col gap-2.5 p-2.5">{cards}</div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,23,32,0.04)]">
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <span className="text-[var(--cat-accent)]" aria-hidden>
              <TypeMark kind="reservation" size={15} />
            </span>
            <span className="min-w-0 flex-1 text-[14px] font-semibold tracking-tight">Reservations today</span>
            <span className="text-[13px] tabular-nums text-[#86868b]">{visible.length}</span>
          </div>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3.5 pb-3.5 [scrollbar-width:thin]">
            {visible.length === 0 ? (
              <div className="w-full px-2 py-6 text-center text-[12px] text-[#a3abb8]">
                {loadError ? "Could not refresh bookings." : "No bookings today"}
              </div>
            ) : (
              visible.map((row) => (
                <div key={row.id} className="w-[240px] shrink-0 snap-start">
                  <ReservationTicketCard
                    row={row}
                    currency={currency}
                    selected={openId === row.id}
                    onOpen={() => setOpenId(row.id)}
                    onStatus={(next) => void setStatus(row, next)}
                  />
                </div>
              ))
            )}
          </div>
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
    </>
  );
}

function ReservationTicketCard({
  row,
  currency,
  selected,
  onOpen,
  onStatus,
}: {
  row: ReservationRow;
  currency: string;
  selected: boolean;
  onOpen: () => void;
  onStatus: (next: ReservationStatus) => void;
}) {
  const items = useMemo(() => parseReservationItems(row.items), [row.items]);
  const count = reservationItemsCount(items);
  const tables = reservationTablesLabel(row);
  const tone = reservationTone(row.status);
  const surface = ticketSurface("reservation", tone === "booked" ? "strong" : tone === "ended" ? "muted" : "normal");
  const next = nextReservationAction(row.status);
  const canNoShow = merchantReservationActions(row.status).includes("no_show");

  return (
    <article
      role="button"
      tabIndex={0}
      className="ops-press flex cursor-pointer flex-col gap-1.5 rounded-[12px] px-3 py-2.5"
      style={{
        background: surface.wash,
        boxShadow: selected ? `inset 0 0 0 2px ${surface.ink}` : `inset 0 0 0 1px ${surface.ink}22`,
      }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: surface.ink }}>
          {RESERVATION_STATUS_META[parseReservationStatus(row.status)].label}
        </span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums tracking-tight text-[var(--cat-ink)]">
          {row.slot}
        </span>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: surface.ink }}>
        {surface.label}
      </span>
      <span className="truncate text-[1.125rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--cat-ink)]">
        {row.name || "Guest"}
      </span>
      <span className="truncate text-[12px] text-[#5a6472]">
        {row.guests} {row.guests === 1 ? "guest" : "guests"}
        {tables !== "No preference" ? ` · ${tables}` : ""}
        {count > 0 ? ` · ${count} ${count === 1 ? "item" : "items"}` : ""}
        {count > 0 ? ` · ${formatMoney(reservationItemsTotal(items), currency)}` : ""}
      </span>
      <div className="mt-0.5 flex flex-col gap-1" onClick={(event) => event.stopPropagation()}>
        {next ? (
          <OpsPrimaryButton pill className="w-full" onClick={() => onStatus(next)}>
            {reservationRailActionLabel(next)}
          </OpsPrimaryButton>
        ) : (
          <span className="inline-flex w-full items-center justify-center gap-1 text-[12px] text-[#86868b]">
            <TypeMark kind="done" size={13} />
            {RESERVATION_TONE[tone].label}
          </span>
        )}
        {canNoShow ? (
          <OpsGhostButton className="w-full text-[#86868b]" onClick={() => onStatus("no_show")}>
            No-show
          </OpsGhostButton>
        ) : null}
      </div>
    </article>
  );
}

export function ReservationDetail({
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
  const primary = nextReservationAction(status);
  const secondary = actions.filter((next) => next !== primary);
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
        className="flex h-[88%] w-full max-w-none flex-col overflow-y-auto rounded-t-[18px] bg-white md:h-full md:max-w-[420px] md:rounded-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ops-glass sticky top-0 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[1.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">
                {row.slot}
              </p>
              <h2 id="reservation-detail-title" className="m-0 mt-2 text-[1.25rem] font-semibold tracking-tight">
                {row.name || "Guest"}
              </h2>
              <p className="m-0 mt-1 text-[13px] text-[#86868b]">
                {formatReserveDay(String(row.day))} · {row.guests} {row.guests === 1 ? "guest" : "guests"}
                {tables !== "No preference" ? ` · ${tables}` : ""}
              </p>
              <p className="m-0 mt-1">
                <StatusCue status={row.status} />
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close booking"
              className="ops-press flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-black/[0.04] text-[16px]"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-4 py-4">
          {primary ? (
            <OpsPrimaryButton
              disabled={busy !== null}
              onClick={() => void changeStatus(primary)}
              className="min-h-11 w-full text-[15px]"
            >
              {busy === primary ? "Saving…" : reservationActionLabel(primary)}
            </OpsPrimaryButton>
          ) : null}
          {secondary.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {secondary.map((next) => (
                <OpsGhostButton
                  key={next}
                  disabled={busy !== null}
                  onClick={() => void changeStatus(next)}
                  className={next === "cancelled" || next === "no_show" ? "text-[#86868b]" : ""}
                >
                  {busy === next ? "Saving…" : reservationActionLabel(next)}
                </OpsGhostButton>
              ))}
            </div>
          ) : null}
          {error ? <p className="m-0 text-sm text-[#b42318]">{error}</p> : null}

          <section>
            <div className="text-[11px] uppercase tracking-[0.06em] text-[#86868b]">Times</div>
            <ul className="mt-1.5 list-none p-0 text-[14px]">
              <li>Booked at {formatOrderDateTime(row.created_at)}</li>
              {row.confirmed_at ? <li>Confirmed at {formatOrderDateTime(row.confirmed_at)}</li> : null}
              {row.seated_at ? <li>Seated at {formatOrderDateTime(row.seated_at)}</li> : null}
              {row.completed_at ? <li>Completed at {formatOrderDateTime(row.completed_at)}</li> : null}
              {row.cancelled_at ? <li>Cancelled at {formatOrderDateTime(row.cancelled_at)}</li> : null}
              {row.no_show_at ? <li>No-show at {formatOrderDateTime(row.no_show_at)}</li> : null}
            </ul>
          </section>
          <section>
            <div className="text-[11px] uppercase tracking-[0.06em] text-[#86868b]">Guest</div>
            <div className="mt-1 text-[15px]">{row.name || "Guest"}</div>
            {row.phone ? (
              <a href={`tel:${row.phone}`} className="mt-1 block text-[14px] text-[var(--cat-accent)]">
                {row.phone}
              </a>
            ) : null}
          </section>
          {row.note ? (
            <section>
              <div className="text-[11px] uppercase tracking-[0.06em] text-[#86868b]">Request</div>
              <p className="mt-1 whitespace-pre-wrap text-[14px]">{row.note}</p>
            </section>
          ) : null}
          <section>
            <div className="text-[11px] uppercase tracking-[0.06em] text-[#86868b]">Pre-ordered food</div>
            {items.length === 0 ? (
              <p className="mt-1 text-[14px] text-[#86868b]">No dishes with this booking.</p>
            ) : (
              <ul className="mt-2 flex list-none flex-col gap-2 p-0">
                {items.map((line, index) => (
                  <li key={`${line.code}-${index}`} className="flex items-start justify-between gap-3 text-[14px]">
                    <span>
                      {line.qty}× {line.name}
                      {line.notes ? <span className="block text-[12px] text-[#86868b]">{line.notes}</span> : null}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatMoney(line.price * line.qty, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 0 ? (
              <div className="mt-3 flex items-baseline justify-between pt-3">
                <span className="text-[13px] text-[#86868b]">Food total</span>
                <span className="text-[16px] font-semibold tabular-nums">
                  {formatMoney(reservationItemsTotal(items), currency)}
                </span>
              </div>
            ) : null}
            {row.order_id ? (
              <p className="mt-2 text-[12px] text-[#86868b]">This food is also on the Orders tab as dine-in.</p>
            ) : null}
          </section>
        </div>
      </aside>
    </div>
  );
}
