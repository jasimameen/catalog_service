import { getServiceClient } from "@/lib/supabase/service";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveCatalogByHost } from "@/lib/catalog/resolve";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import { guestCanCancelOrder, parseOrderStatuses, statusLabel } from "@/lib/catalog/order-statuses";
import { guestCanCancelReservation, parseReservationStatus, reservationStatusLabel } from "@/lib/catalog/reservation-status";
import { parseReservationItems } from "@/lib/catalog/reservation-items";
import { reservationTableRefs } from "@/lib/catalog/reservation-tables";
import {
  requestIp,
  requestTrackKey,
  ticketUnlockMatches,
  trackAttemptAllowed,
  TRACK_UNLOCK_FAILED,
  type GuestTrackTicket,
} from "@/lib/catalog/guest-track";
import type { OrderItemRow, OrderRow, ReservationRow, SelectedOption } from "@/lib/supabase/types";

function clean(value: unknown, max = 80): string {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";
}

async function resolveHostCatalog(host: string) {
  const trimmed = host.trim();
  if (!trimmed) return null;
  try {
    return await resolveCatalogByHost(trimmed);
  } catch {
    return null;
  }
}

function orderLines(items: OrderItemRow[]): GuestTrackTicket["items"] {
  return items.map((line) => ({
    name: line.name,
    qty: line.qty,
    total: Number(line.line_total || Number(line.price) * line.qty),
    options: formatSelectedOptions(Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : []) || undefined,
  }));
}

async function loadOrderTicket(
  order: OrderRow,
  shopName: string,
  shopPhone: string,
): Promise<GuestTrackTicket> {
  const supabase = getServiceClient();
  const [{ data: lineData }, { data: catalogRow }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id),
    supabase.from("catalogs").select("order_statuses").eq("id", order.catalog_id).maybeSingle(),
  ]);
  const items = (lineData ?? []) as OrderItemRow[];
  const statuses = parseOrderStatuses((catalogRow as { order_statuses?: unknown } | null)?.order_statuses);
  return {
    kind: "order",
    reference: order.reference,
    status: order.status,
    statusLabel: statusLabel(statuses, order.status),
    createdAt: order.created_at,
    items: orderLines(items),
    total: Number(order.subtotal),
    tableNo: order.table_no ?? null,
    fulfillment: order.fulfillment ?? null,
    day: null,
    slot: null,
    guests: null,
    shopPhone,
    shopName,
    canCancel: guestCanCancelOrder(order.status, statuses),
    note: order.notes ?? null,
    unlockHint: order.phone ? "the phone number you entered" : order.table_no ? `table ${order.table_no}` : "the number you entered",
  };
}

function reservationTicket(row: ReservationRow, shopName: string, shopPhone: string): GuestTrackTicket {
  const items = parseReservationItems(row.items);
  const tables = reservationTableRefs(row);
  const tableNo = tables.map((t) => t.no).filter(Boolean).join(" + ") || row.table_no || null;
  return {
    kind: "reservation",
    reference: tableNo ? `Table ${tableNo}` : row.name,
    status: parseReservationStatus(row.status),
    statusLabel: reservationStatusLabel(row.status),
    createdAt: row.created_at,
    items: items.map((line) => ({
      name: line.name,
      qty: line.qty,
      total: line.price * line.qty,
      options: formatSelectedOptions(line.options ?? []) || undefined,
    })),
    total: items.length > 0 ? items.reduce((sum, line) => sum + line.price * line.qty, 0) : null,
    tableNo,
    fulfillment: null,
    day: row.day,
    slot: row.slot,
    guests: row.guests,
    shopPhone,
    shopName,
    canCancel: guestCanCancelReservation(row.status),
    note: row.note ?? null,
    unlockHint: "the phone number you booked with",
  };
}

async function findTicket(token: string, catalogId: string) {
  const supabase = getServiceClient();
  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("catalog_id", catalogId)
    .eq("track_token", token)
    .maybeSingle();
  const order = orderData as OrderRow | null;
  if (order) return { kind: "order" as const, order, reservation: null };
  const { data: reservationData } = await supabase
    .from("reservations")
    .select("*")
    .eq("catalog_id", catalogId)
    .eq("track_token", token)
    .maybeSingle();
  const reservation = reservationData as ReservationRow | null;
  if (reservation) return { kind: "reservation" as const, order: null, reservation };
  return null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Tracking is not configured yet." }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });
  const token = clean(body.token, 40);
  const phone = clean(body.phone, 40);
  const host = clean(body.host, 120);
  if (!token || token.length < 8 || !phone || !host) {
    return Response.json({ error: "Customer number is required." }, { status: 400 });
  }
  if (!trackAttemptAllowed(requestTrackKey(requestIp(request.headers), token))) {
    return Response.json({ error: "Too many tries. Call the shop, or wait and try again." }, { status: 429 });
  }
  const catalog = await resolveHostCatalog(host);
  if (!catalog) return Response.json({ error: TRACK_UNLOCK_FAILED }, { status: 404 });
  const found = await findTicket(token, catalog.id);
  if (!found) return Response.json({ error: TRACK_UNLOCK_FAILED }, { status: 404 });
  const unlock =
    found.kind === "order"
      ? ticketUnlockMatches({ phone: found.order.phone, tableNo: found.order.table_no, entered: phone })
      : ticketUnlockMatches({ phone: found.reservation.phone, tableNo: found.reservation.table_no, entered: phone });
  if (!unlock) return Response.json({ error: TRACK_UNLOCK_FAILED }, { status: 404 });
  const ticket =
    found.kind === "order"
      ? await loadOrderTicket(found.order, catalog.name, catalog.phone)
      : reservationTicket(found.reservation, catalog.name, catalog.phone);
  return Response.json({ ok: true, ticket });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Tracking is not configured yet." }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });
  const token = clean(body.token, 40);
  const phone = clean(body.phone, 40);
  const host = clean(body.host, 120);
  const action = clean(body.action, 20);
  if (!token || !phone || !host || action !== "cancel") {
    return Response.json({ error: "Customer number is required to cancel." }, { status: 400 });
  }
  if (!trackAttemptAllowed(requestTrackKey(requestIp(request.headers), `cancel:${token}`))) {
    return Response.json({ error: "Too many tries. Call the shop, or wait and try again." }, { status: 429 });
  }
  const catalog = await resolveHostCatalog(host);
  if (!catalog) return Response.json({ error: TRACK_UNLOCK_FAILED }, { status: 404 });
  const found = await findTicket(token, catalog.id);
  if (!found) return Response.json({ error: TRACK_UNLOCK_FAILED }, { status: 404 });
  const supabase = getServiceClient();

  if (found.kind === "order") {
    const order = found.order;
    if (!ticketUnlockMatches({ phone: order.phone, tableNo: order.table_no, entered: phone })) {
      return Response.json({ error: TRACK_UNLOCK_FAILED }, { status: 404 });
    }
    const { data: catalogRow } = await supabase
      .from("catalogs")
      .select("order_statuses")
      .eq("id", catalog.id)
      .maybeSingle();
    const statuses = parseOrderStatuses((catalogRow as { order_statuses?: unknown } | null)?.order_statuses);
    if (!guestCanCancelOrder(order.status, statuses)) {
      return Response.json({ error: "This order can no longer be cancelled online. Call the shop." }, { status: 400 });
    }
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("catalog_id", catalog.id);
    if (error) return Response.json({ error: "Could not cancel." }, { status: 500 });
    await supabase.from("order_status_events").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: "cancelled",
      actor: "customer",
    });
    const next = { ...order, status: "cancelled" };
    return Response.json({ ok: true, ticket: await loadOrderTicket(next, catalog.name, catalog.phone) });
  }

  const row = found.reservation;
  if (!ticketUnlockMatches({ phone: row.phone, tableNo: row.table_no, entered: phone })) {
    return Response.json({ error: TRACK_UNLOCK_FAILED }, { status: 404 });
  }
  if (!guestCanCancelReservation(row.status)) {
    return Response.json({ error: "This booking can no longer be cancelled online. Call the shop." }, { status: 400 });
  }
  const cancelledAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("reservations")
    .update({ status: "cancelled", cancelled_at: cancelledAt })
    .eq("id", row.id)
    .eq("catalog_id", catalog.id)
    .select("*")
    .single();
  if (error) {
    return Response.json({ error: "Could not cancel." }, { status: 500 });
  }
  await supabase.from("reservation_status_events").insert({
    reservation_id: row.id,
    from_status: parseReservationStatus(row.status),
    to_status: "cancelled",
    actor: "customer",
  });
  return Response.json({
    ok: true,
    ticket: reservationTicket((updated as ReservationRow) ?? { ...row, status: "cancelled", cancelled_at: cancelledAt }, catalog.name, catalog.phone),
  });
}
