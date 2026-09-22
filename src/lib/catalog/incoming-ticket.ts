import { formatMoney } from "@/lib/catalog/currency";
import { orderIdentity } from "@/lib/catalog/order-identity";
import {
  parseReservationItems,
  reservationItemsCount,
  reservationItemsTotal,
} from "@/lib/catalog/reservation-items";
import { reservationTablesLabel } from "@/lib/catalog/reservation-tables";
import type { OrderRow, ReservationRow, ServiceRequestRow } from "@/lib/supabase/types";
import { guestLabel, notifyKind, notifyToastTitle, type NotifyCueKind } from "./order-notify";

export type IncomingTicketKind = NotifyCueKind;

export type IncomingTicket = {
  id: string;
  kind: IncomingTicketKind;
  href: string;
  title: string;
  who: string;
  detail: string;
  mark: "dine_in" | "pickup" | "delivery" | "catalog" | "reservation";
};

export const OPEN_INCOMING_TICKET_EVENT = "catalog-open-incoming-ticket";

export type OpenIncomingTicketDetail = {
  catalogId: string;
  kind: IncomingTicketKind;
  id: string;
};

export function incomingOrderHref(catalogId: string, orderId: string): string {
  return `/admin/${catalogId}/orders?order=${encodeURIComponent(orderId)}`;
}

export function incomingReservationHref(catalogId: string, reservationId: string): string {
  return `/admin/${catalogId}/orders?inbox=reservations&reservation=${encodeURIComponent(reservationId)}`;
}

export function incomingServiceHref(catalogId: string): string {
  return `/admin/${catalogId}/orders`;
}

export function ticketFromOrder(catalogId: string, order: OrderRow, currency: string): IncomingTicket {
  const identity = orderIdentity(order);
  const kind = notifyKind(order.fulfillment);
  const amount = formatMoney(Number(order.subtotal), currency);
  return {
    id: order.id,
    kind: "order",
    href: incomingOrderHref(catalogId, order.id),
    title: notifyToastTitle(kind),
    who: identity.title,
    detail: [identity.meta !== identity.title ? identity.meta : guestLabel(order), amount, order.reference]
      .filter(Boolean)
      .join(" · "),
    mark: identity.kind,
  };
}

export function ticketFromReservation(catalogId: string, row: ReservationRow, currency: string): IncomingTicket {
  const items = parseReservationItems(row.items);
  const count = reservationItemsCount(items);
  const total = reservationItemsTotal(items);
  const tables = reservationTablesLabel(row);
  const food =
    count > 0
      ? `${count} ${count === 1 ? "dish" : "dishes"}${total > 0 ? ` · ${formatMoney(total, currency)}` : ""}`
      : "";
  return {
    id: row.id,
    kind: "reservation",
    href: incomingReservationHref(catalogId, row.id),
    title: "New booking",
    who: row.name || "Guest",
    detail: [row.slot, `${row.guests} ${row.guests === 1 ? "guest" : "guests"}`, tables !== "No preference" ? tables : "", food]
      .filter(Boolean)
      .join(" · "),
    mark: "reservation",
  };
}

function serviceKindLabel(kind: string): string {
  if (kind === "bill") return "Bill";
  if (kind === "waiter") return "Waiter";
  return kind || "Help";
}

export function ticketFromService(catalogId: string, row: ServiceRequestRow): IncomingTicket {
  return {
    id: row.id,
    kind: "service",
    href: incomingServiceHref(catalogId),
    title: `${serviceKindLabel(row.kind)} needed`,
    who: row.table_no ? `Table ${row.table_no}` : "A table",
    detail: row.note?.trim() || "Guest asked for help",
    mark: "dine_in",
  };
}

export function incomingStackLabel(tickets: IncomingTicket[]): string | null {
  if (tickets.length < 2) return null;
  const kinds = new Set(tickets.map((row) => row.kind));
  if (kinds.size === 1) {
    const kind = tickets[0]!.kind;
    if (kind === "order") return `${tickets.length} new orders`;
    if (kind === "reservation") return `${tickets.length} new bookings`;
    return `${tickets.length} tables need you`;
  }
  return `${tickets.length} new tickets`;
}

export function openIncomingTicket(detail: OpenIncomingTicketDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OpenIncomingTicketDetail>(OPEN_INCOMING_TICKET_EVENT, { detail }));
}

export function demoIncomingTicket(catalogId: string, kind: IncomingTicketKind, currency: string): IncomingTicket {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  if (kind === "reservation") {
    return ticketFromReservation(catalogId, {
      id: `demo-res-${suffix}`,
      catalog_id: catalogId,
      table_id: null,
      table_no: "12",
      day: new Date().toISOString().slice(0, 10),
      slot: "19:30",
      guests: 4,
      name: "Demo guest",
      phone: "",
      note: null,
      created_at: new Date().toISOString(),
    }, currency);
  }
  if (kind === "service") {
    return ticketFromService(catalogId, {
      id: `demo-svc-${suffix}`,
      catalog_id: catalogId,
      table_no: "7",
      kind: "waiter",
      note: "Demo — table asked for a waiter",
      created_at: new Date().toISOString(),
    });
  }
  return ticketFromOrder(
    catalogId,
    {
      id: `demo-ord-${suffix}`,
      catalog_id: catalogId,
      reference: `DEMO-${suffix}`,
      shop_name: "Demo guest",
      phone: "",
      location: "",
      maps_link: null,
      notes: null,
      subtotal: 42,
      status: "received",
      fulfillment: "pickup",
      created_at: new Date().toISOString(),
    },
    currency,
  );
}
