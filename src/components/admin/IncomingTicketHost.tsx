"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { catalogIncomingMeta } from "@/app/admin/[catalogId]/actions";
import {
  incomingStackLabel,
  demoIncomingTicket,
  openIncomingTicket,
  ticketFromOrder,
  ticketFromReservation,
  ticketFromService,
  type IncomingTicket,
  type IncomingTicketKind,
} from "@/lib/catalog/incoming-ticket";
import {
  announceIncomingTicket,
  asCatalogOrder,
  asCatalogReservation,
  asCatalogServiceRequest,
  fetchCatalogOrders,
  fetchCatalogReservations,
  fetchServiceRequests,
  rowCatalogId,
  useCatalogLiveChannel,
  useLiveRefresh,
} from "@/lib/catalog/live-orders";
import { notifyKind } from "@/lib/catalog/order-notify";
import { DEFAULT_TEMPLATE_SETTINGS, type NotifySoundSettings } from "@/lib/catalog/template-settings";
import { TypeMark } from "@/components/orders/FulfillmentTypeBadge";
import { OpsGhostButton, OpsPrimaryButton } from "@/components/admin/ops/OpsChrome";

const RESERVED = new Set(["settings", "account", "inquiries", "ops"]);

function catalogIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const second = segments[1];
  if (segments[0] !== "admin" || !second || RESERVED.has(second)) return null;
  return second;
}

export function IncomingTicketHost() {
  const pathname = usePathname();
  const catalogId = catalogIdFromPath(pathname);
  if (!catalogId) return null;
  return <IncomingTicketListener key={catalogId} catalogId={catalogId} />;
}

function IncomingTicketListener({ catalogId }: { catalogId: string }) {
  const router = useRouter();
  const [tickets, setTickets] = useState<IncomingTicket[]>([]);
  const [currency, setCurrency] = useState("AED");
  const soundsRef = useRef<NotifySoundSettings>(DEFAULT_TEMPLATE_SETTINGS.notify);
  const seenIds = useRef(new Set<string>());
  const hydrated = useRef(false);
  const pending = useRef<IncomingTicket[]>([]);

  const pushTicket = useCallback((ticket: IncomingTicket, announce: boolean, orderKind?: ReturnType<typeof notifyKind>) => {
    if (seenIds.current.has(ticket.id)) return;
    if (!hydrated.current) {
      pending.current.push(ticket);
      return;
    }
    seenIds.current.add(ticket.id);
    if (announce) announceIncomingTicket(ticket, soundsRef.current, orderKind);
    setTickets((prev) => [ticket, ...prev.filter((row) => row.id !== ticket.id)].slice(0, 8));
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (!hydrated.current) {
        const [meta, orders, reservations, requests] = await Promise.all([
          catalogIncomingMeta(catalogId),
          fetchCatalogOrders(catalogId, 24),
          fetchCatalogReservations(catalogId, 24),
          fetchServiceRequests(catalogId, 24),
        ]);
        if (meta) {
          setCurrency(meta.currency);
          soundsRef.current = meta.notify;
        }
        for (const row of orders) seenIds.current.add(row.id);
        for (const row of reservations) seenIds.current.add(row.id);
        for (const row of requests) seenIds.current.add(row.id);
        hydrated.current = true;
        const held = pending.current.splice(0);
        for (const ticket of held) {
          if (seenIds.current.has(ticket.id)) continue;
          seenIds.current.add(ticket.id);
          announceIncomingTicket(ticket, soundsRef.current);
          setTickets((prev) => [ticket, ...prev.filter((row) => row.id !== ticket.id)].slice(0, 8));
        }
        return;
      }
      const [orders, reservations, requests] = await Promise.all([
        fetchCatalogOrders(catalogId, 24),
        fetchCatalogReservations(catalogId, 24),
        fetchServiceRequests(catalogId, 24),
      ]);
      for (const order of orders) {
        pushTicket(ticketFromOrder(catalogId, order, currency), true, notifyKind(order.fulfillment));
      }
      for (const row of reservations) {
        pushTicket(ticketFromReservation(catalogId, row, currency), true);
      }
      for (const row of requests) {
        pushTicket(ticketFromService(catalogId, row), true);
      }
    } catch {
      hydrated.current = true;
    }
  }, [catalogId, currency, pushTicket]);

  const onRealtime = useCallback(
    (table: "orders" | "service_requests" | "reservations", eventType: string, row: unknown) => {
      if (eventType !== "INSERT") return;
      const cid = rowCatalogId(row);
      if (cid && cid !== catalogId) return;
      if (table === "orders") {
        const order = asCatalogOrder(row, catalogId);
        if (order) pushTicket(ticketFromOrder(catalogId, order, currency), true, notifyKind(order.fulfillment));
        return;
      }
      if (table === "reservations") {
        const reservation = asCatalogReservation(row, catalogId);
        if (reservation) pushTicket(ticketFromReservation(catalogId, reservation, currency), true);
        return;
      }
      const request = asCatalogServiceRequest(row, catalogId);
      if (request) pushTicket(ticketFromService(catalogId, request), true);
    },
    [catalogId, currency, pushTicket],
  );

  useCatalogLiveChannel(catalogId, ["orders", "reservations", "service_requests"], onRealtime);
  useLiveRefresh(refresh);

  useEffect(() => {
    function onDemo(event: Event) {
      const raw = (event as CustomEvent<{ kind?: IncomingTicketKind }>).detail?.kind;
      const kind: IncomingTicketKind =
        raw === "reservation" || raw === "service" || raw === "order" ? raw : "order";
      const ticket = demoIncomingTicket(catalogId, kind, currency);
      hydrated.current = true;
      announceIncomingTicket(ticket, soundsRef.current, kind === "order" ? "pickup" : undefined);
      setTickets((prev) => [ticket, ...prev.filter((row) => row.id !== ticket.id)].slice(0, 8));
    }
    window.addEventListener("catalog-demo-incoming", onDemo);
    const host = window as Window & { __demoIncomingTicket?: (kind?: IncomingTicketKind) => void };
    host.__demoIncomingTicket = (kind) => {
      window.dispatchEvent(new CustomEvent("catalog-demo-incoming", { detail: { kind: kind ?? "order" } }));
    };
    return () => {
      window.removeEventListener("catalog-demo-incoming", onDemo);
      delete host.__demoIncomingTicket;
    };
  }, [catalogId, currency]);

  const latest = tickets[0] ?? null;

  function dismiss(id: string) {
    setTickets((prev) => prev.filter((row) => row.id !== id));
  }

  function dismissLatest() {
    if (latest) dismiss(latest.id);
  }

  function openLatest() {
    if (!latest) return;
    const ticket = latest;
    dismiss(ticket.id);
    openIncomingTicket({ catalogId, kind: ticket.kind, id: ticket.id });
    router.push(ticket.href);
  }

  return (
    <IncomingTicketOverlay
      tickets={tickets}
      onOpen={openLatest}
      onDismiss={dismissLatest}
    />
  );
}

function IncomingTicketOverlay({
  tickets,
  onOpen,
  onDismiss,
}: {
  tickets: IncomingTicket[];
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const latest = tickets[0] ?? null;
  const stack = incomingStackLabel(tickets);

  useEffect(() => {
    if (!latest) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [latest, onDismiss]);

  if (!latest) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-end justify-center p-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] md:items-start md:pt-7">
      <button
        type="button"
        className="incoming-ticket-scrim pointer-events-auto absolute inset-0 bg-[rgba(16,23,32,0.28)]"
        aria-label="Dismiss incoming ticket"
        onClick={onDismiss}
      />
      <div
        key={latest.id}
        role="alertdialog"
        aria-live="assertive"
        aria-labelledby="incoming-ticket-title"
        aria-describedby="incoming-ticket-detail"
        className="incoming-ticket-card pointer-events-auto relative w-full max-w-[26rem] overflow-hidden rounded-[18px] bg-white shadow-[0_18px_50px_rgba(16,23,32,0.22)]"
      >
        <div className="ops-glass px-4 pb-3.5 pt-3.5 sm:px-[18px]">
          {stack ? (
            <p className="m-0 mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[#86868b]">
              {stack}
            </p>
          ) : null}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-[var(--cat-accent)]" aria-hidden>
              <TypeMark kind={latest.mark} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                id="incoming-ticket-title"
                className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-[var(--cat-ink)]"
              >
                {latest.title}
              </p>
              <p className="m-0 mt-0.5 truncate text-[15px] font-medium text-[var(--cat-ink)]">
                {latest.who}
              </p>
              <p
                id="incoming-ticket-detail"
                className="m-0 mt-0.5 text-[13px] leading-snug text-[#5a6472]"
              >
                {latest.detail}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-end gap-2">
            <OpsGhostButton onClick={onDismiss}>Later</OpsGhostButton>
            <OpsPrimaryButton onClick={onOpen}>Open</OpsPrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
