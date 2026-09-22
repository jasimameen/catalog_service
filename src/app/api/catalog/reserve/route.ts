import { incomingReservationHref } from "@/lib/catalog/incoming-ticket";
import { sendPushToAccount } from "@/lib/push/send";
import { getServiceClient } from "@/lib/supabase/service";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { isFloorPlanEnabled, parseTemplateSettings } from "@/lib/catalog/template-settings";
import { parseCheckoutFields } from "@/lib/catalog/checkout-fields";
import { generateOrderReference } from "@/lib/catalog/currency";
import {
  formatComboIncludes,
  isComboItem,
  parseComboLines,
  resolveComboIncludes,
  type ComboSnapshot,
} from "@/lib/catalog/combos";
import { parseItemOptions, resolveSelectedOptions, unitPriceWithOptions } from "@/lib/catalog/item-options";
import { resolveIncomingOrderStatus } from "@/lib/catalog/order-statuses";
import { newTrackToken } from "@/lib/catalog/order-tracking";
import { parseReservationItems, RESERVATIONS_ITEMS_SQL_HINT } from "@/lib/catalog/reservation-items";
import {
  parseReservationTables,
  reservationTableRefs,
  tableRefsOverlap,
  type ReservationTableRef,
} from "@/lib/catalog/reservation-tables";
import {
  DEFAULT_RESERVATION_STATUS,
  guestCanCancelReservation,
  parseReservationStatus,
  reservationLocksTables,
  RESERVATIONS_STATUS_SQL_HINT,
} from "@/lib/catalog/reservation-status";
import type {
  CatalogItemRow,
  CatalogRow,
  ReservationItemSnap,
  ReservationRow,
  SelectedOption,
} from "@/lib/supabase/types";
import type { FloorTable } from "@/lib/catalog/template-settings";

function clean(value: unknown, max = 120): string {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";
}

type RequestedLine = {
  code: string;
  qty: number;
  options?: SelectedOption[];
  notes?: string;
};

function parseRequestedLines(raw: unknown): RequestedLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: RequestedLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const code = clean(obj.code, 64);
    const qty = Math.floor(Number(obj.qty));
    if (!code || !Number.isFinite(qty) || qty <= 0) continue;
    lines.push({
      code,
      qty: Math.min(99, qty),
      options: Array.isArray(obj.options) ? (obj.options as SelectedOption[]) : undefined,
      notes: clean(obj.notes, 200) || undefined,
    });
  }
  return lines;
}

type ResolvedLine = {
  code: string;
  category: string;
  name: string;
  price: number;
  qty: number;
  options: SelectedOption[];
  notes: string;
  combo: ComboSnapshot[];
};

function resolveLines(
  requested: RequestedLine[],
  catalogItems: CatalogItemRow[],
): { items: ResolvedLine[]; error?: string } {
  const items: ResolvedLine[] = [];
  for (const entry of requested) {
    const item = catalogItems.find((row) => row.code === entry.code);
    if (!item) continue;
    const groups = parseItemOptions(item.options);
    const resolved = resolveSelectedOptions(groups, entry.options);
    if (resolved.error) return { items: [], error: resolved.error };
    const price = unitPriceWithOptions(Number(item.price), resolved.options);
    const combo = isComboItem(item)
      ? resolveComboIncludes(parseComboLines(item.combo_lines), catalogItems).map((row) => ({
          item_id: row.item_id,
          code: row.code,
          name: row.name,
          qty: row.qty,
        }))
      : [];
    items.push({
      code: item.code,
      category: item.category,
      name: item.name,
      price,
      qty: entry.qty,
      options: resolved.options,
      notes: entry.notes ?? "",
      combo,
    });
  }
  return { items };
}

function asSnap(items: ResolvedLine[]): ReservationItemSnap[] {
  return items.map((item) => ({
    code: item.code,
    name: item.name,
    qty: item.qty,
    price: item.price,
    options: item.options.length > 0 ? item.options : undefined,
    notes: item.notes || undefined,
  }));
}

function missingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || Boolean(error.message?.includes("items") || error.message?.includes("order_id") || error.message?.includes("table_ids") || error.message?.includes("status"));
}

function incomingTables(body: Record<string, unknown>): ReservationTableRef[] {
  const fromList = parseReservationTables(body.tables ?? body.tableIds);
  if (fromList.length > 0) return fromList;
  const id = clean(body.tableId, 40);
  const no = clean(body.tableNo, 16);
  if (id || no) return [{ id: id || no, no: no || id }];
  return [];
}

function resolveBookableTables(
  wanted: ReservationTableRef[],
  floorTables: FloorTable[],
): { tables: FloorTable[]; error?: string } {
  const found: FloorTable[] = [];
  for (const ref of wanted) {
    const table = floorTables.find(
      (t) =>
        t.bookable &&
        t.status === "open" &&
        ((ref.id && t.id === ref.id) || (ref.no && t.no === ref.no)),
    );
    if (!table) return { tables: [], error: `Table ${ref.no || ref.id} is not bookable.` };
    if (!found.some((row) => row.id === table.id)) found.push(table);
  }
  return { tables: found };
}

function asBookedMarks(rows: ReservationRow[]): ReservationTableRef[] {
  const out: ReservationTableRef[] = [];
  for (const row of rows) {
    if (!reservationLocksTables(row.status)) continue;
    for (const ref of reservationTableRefs(row)) {
      if (!out.some((t) => t.id === ref.id || t.no === ref.no)) out.push(ref);
    }
  }
  return out;
}

async function loadSlotReservations(catalogId: string, day: string, slot: string): Promise<ReservationRow[]> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("reservations")
    .select("*")
    .eq("catalog_id", catalogId)
    .eq("day", day)
    .eq("slot", slot);
  return (data ?? []) as ReservationRow[];
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Reservations are not configured yet." }, { status: 500 });
  }
  const url = new URL(request.url);
  const catalogId = clean(url.searchParams.get("catalogId"), 80);
  const day = clean(url.searchParams.get("day"), 16);
  const slot = clean(url.searchParams.get("slot"), 16);
  if (!catalogId || !day || !slot) {
    return Response.json({ error: "Catalog, day and time are required." }, { status: 400 });
  }
  const rows = await loadSlotReservations(catalogId, day, slot);
  return Response.json({
    tables: asBookedMarks(rows).map((t) => ({ id: t.id, no: t.no })),
  });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Reservations are not configured yet." }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });
  const catalogId = clean(body.catalogId, 80);
  const reservationId = clean(body.reservationId, 80);
  const phone = clean(body.phone, 40);
  const action = clean(body.action, 20);
  if (!catalogId || !reservationId || action !== "cancel" || !phone) {
    return Response.json({ error: "Name, phone and booking are required to cancel." }, { status: 400 });
  }
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .eq("catalog_id", catalogId)
    .maybeSingle();
  const row = data as ReservationRow | null;
  if (!row || row.phone !== phone) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  if (!guestCanCancelReservation(row.status)) {
    return Response.json({ error: "This booking can no longer be cancelled online." }, { status: 400 });
  }
  const cancelledAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("reservations")
    .update({ status: "cancelled", cancelled_at: cancelledAt })
    .eq("id", reservationId)
    .eq("catalog_id", catalogId)
    .select("*")
    .single();
  if (error) {
    if (error.code === "42703" || error.message.includes("status")) {
      return Response.json({ error: RESERVATIONS_STATUS_SQL_HINT }, { status: 500 });
    }
    return Response.json({ error: "Could not cancel." }, { status: 500 });
  }
  await supabase.from("reservation_status_events").insert({
    reservation_id: reservationId,
    from_status: parseReservationStatus(row.status),
    to_status: "cancelled",
    actor: "customer",
  });
  return Response.json({ ok: true, reservation: updated });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Reservations are not configured yet." }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const catalogId = clean(body.catalogId, 80);
  const day = clean(body.day, 16);
  const slot = clean(body.slot, 16);
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 40);
  const note = clean(body.note, 200);
  const guests = Math.max(1, Math.min(40, Math.floor(Number(body.guests) || 2)));
  const requested = parseRequestedLines(body.items);
  const wanted = incomingTables(body);

  if (!catalogId || !day || !slot || !name || !phone) {
    return Response.json({ error: "Name, phone, day and time are required." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: catalogData } = await supabase
    .from("catalogs")
    .select("*")
    .eq("id", catalogId)
    .maybeSingle();
  const catalog = catalogData as CatalogRow | null;
  if (!catalog || catalog.status !== "live") {
    return Response.json({ error: "This catalog is not available." }, { status: 404 });
  }
  const settings = parseTemplateSettings(catalog.template_settings);
  if (!settings.restaurant.enableReserve) {
    return Response.json({ error: "Reservations are off." }, { status: 403 });
  }
  if (guests < settings.restaurant.guestMin || guests > settings.restaurant.guestMax) {
    return Response.json({ error: "Guest count is outside the allowed range." }, { status: 400 });
  }
  const resolvedTables = isFloorPlanEnabled(settings)
    ? resolveBookableTables(wanted, settings.floor.tables)
    : { tables: [] };
  if (resolvedTables.error) return Response.json({ error: resolvedTables.error }, { status: 400 });
  const chosen = resolvedTables.tables;
  const tableRefs = chosen.map((t) => ({ id: t.id, no: t.no }));
  const primary = chosen[0] ?? null;
  const tableLabel = tableRefs.map((t) => t.no).join(", ");
  if (tableRefs.length > 0) {
    const booked = asBookedMarks(await loadSlotReservations(catalogId, day, slot));
    const clash = tableRefsOverlap(booked, tableRefs);
    if (clash.length > 0) {
      return Response.json(
        { error: `${clash.map((t) => `Table ${t.no}`).join(" + ")} is already reserved for this time.` },
        { status: 409 },
      );
    }
  }

  let resolved: ResolvedLine[] = [];
  if (requested.length > 0) {
    const { data: itemRows } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("catalog_id", catalogId)
      .eq("visible", true);
    const catalogItems = (itemRows as CatalogItemRow[] | null) ?? [];
    const built = resolveLines(requested, catalogItems);
    if (built.error) return Response.json({ error: built.error }, { status: 400 });
    resolved = built.items;
  }

  const snaps = asSnap(resolved);
  let orderId: string | null = null;
  let orderReference: string | null = null;

  if (resolved.length > 0) {
    const created = await createLinkedOrder({
      catalog,
      catalogId,
      name,
      phone,
      tableNo: tableLabel,
      day,
      slot,
      guests,
      note,
      items: resolved,
    });
    if (created.error && !created.orderId) {
      return Response.json({ error: created.error }, { status: 500 });
    }
    orderId = created.orderId;
    orderReference = created.reference;
  }

  const baseRow = {
    catalog_id: catalogId,
    table_id: primary?.id ?? null,
    table_no: primary?.no ?? null,
    day,
    slot,
    guests,
    name,
    phone,
    note: note || null,
  };

  const fullRow = {
    ...baseRow,
    table_ids: tableRefs,
    items: snaps,
    order_id: orderId,
    status: DEFAULT_RESERVATION_STATUS,
  };

  const first = await supabase.from("reservations").insert(fullRow).select("*").single();
  if (first.error) {
    if (first.error.code === "42P01" || first.error.message.includes("reservations")) {
      return Response.json({ error: "Run supabase/template-settings.sql, then try again." }, { status: 500 });
    }
    if (missingColumn(first.error)) {
      const fallback = await supabase.from("reservations").insert({ ...baseRow, items: snaps, order_id: orderId }).select("*").single();
      if (fallback.error) {
        const last = await supabase.from("reservations").insert(baseRow).select("*").single();
        if (last.error) {
          return Response.json({ error: "Could not save the reservation." }, { status: 500 });
        }
        notifyNewReservation(catalog, last.data);
        return Response.json({
          ok: true,
          reservationId: last.data?.id ?? null,
          reservation: last.data,
          orderId,
          orderReference,
          items: snaps,
          sqlHint: RESERVATIONS_ITEMS_SQL_HINT,
        });
      }
      notifyNewReservation(catalog, fallback.data);
      return Response.json({
        ok: true,
        reservationId: fallback.data?.id ?? null,
        reservation: fallback.data,
        orderId,
        orderReference,
        items: snaps,
        sqlHint: RESERVATIONS_ITEMS_SQL_HINT,
      });
    }
    return Response.json({ error: "Could not save the reservation." }, { status: 500 });
  }

  await supabase.from("reservation_status_events").insert({
    reservation_id: first.data.id,
    from_status: null,
    to_status: DEFAULT_RESERVATION_STATUS,
    actor: "customer",
  });

  notifyNewReservation(catalog, first.data);

  return Response.json({
    ok: true,
    reservationId: first.data.id,
    reservation: first.data,
    orderId,
    orderReference,
    items: parseReservationItems(snaps),
  });
}

function notifyNewReservation(
  catalog: CatalogRow,
  reservation: { id?: string | null; name?: string | null; slot?: string | null; guests?: number | null } | null,
) {
  if (!reservation?.id) return;
  const guests = reservation.guests ? `${reservation.guests} ${reservation.guests === 1 ? "guest" : "guests"}` : "";
  void sendPushToAccount(catalog.account_id, {
    title: "New booking",
    body: [reservation.name || "Guest", reservation.slot, guests].filter(Boolean).join(" · "),
    data: {
      kind: "new_reservation",
      reservationId: reservation.id,
      catalogId: catalog.id,
      href: incomingReservationHref(catalog.id, reservation.id),
    },
  });
}

async function createLinkedOrder(args: {
  catalog: CatalogRow;
  catalogId: string;
  name: string;
  phone: string;
  tableNo: string;
  day: string;
  slot: string;
  guests: number;
  note: string;
  items: ResolvedLine[];
}): Promise<{ orderId: string | null; reference: string | null; error?: string }> {
  const { catalog, catalogId, name, phone, tableNo, day, slot, guests, note, items } = args;
  const supabase = getServiceClient();
  const checkout = parseCheckoutFields(catalog.checkout_fields);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const reference = generateOrderReference(catalog.slug, checkout.orderPrefix);
  const status = resolveIncomingOrderStatus(catalog);
  const trackToken = newTrackToken();
  const bookingNote = [`Reserved ${day} ${slot} · ${guests} ${guests === 1 ? "guest" : "guests"}`, note]
    .filter(Boolean)
    .join("\n");
  const foodNote =
    items.length > 0
      ? items
          .map((item) => {
            const extras = item.options
              .map((group) => group.values.map((value) => value.name).join(", "))
              .filter(Boolean)
              .join(" · ");
            const includes = item.combo.length > 0 ? ` [Includes ${formatComboIncludes(item.combo)}]` : "";
            return `${item.qty}× ${item.name}${extras ? ` (${extras})` : ""}${includes}`;
          })
          .join(", ")
      : "";

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      catalog_id: catalogId,
      reference,
      shop_name: name,
      phone,
      location: "",
      maps_link: null,
      notes: [bookingNote, foodNote].filter(Boolean).join("\n") || null,
      subtotal: total,
      status,
      track_token: trackToken,
      fulfillment: "dine_in",
      table_no: tableNo,
      form_values: {
        reservation: "1",
        day,
        slot,
        guests: String(guests),
        name,
        phone,
        table: tableNo,
        table_no: tableNo,
        notes: note,
      },
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    console.error("Reserve order: failed to save dine-in order", orderError);
    return { orderId: null, reference: null, error: "Could not save the pre-order. Try again." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: orderRow.id,
      code: item.code,
      category: item.category,
      name: item.name,
      price: item.price,
      qty: item.qty,
      line_total: item.price * item.qty,
      options_json: item.options,
      notes: item.notes || null,
      combo_json: item.combo,
    })),
  );

  if (itemsError) {
    console.error("Reserve order: failed to save items", itemsError);
    await supabase.from("orders").delete().eq("id", orderRow.id);
    return { orderId: null, reference: null, error: "Could not save the pre-order. Try again." };
  }

  await supabase.from("order_status_events").insert({
    order_id: orderRow.id,
    from_status: null,
    to_status: status,
    actor: "customer",
  });

  return { orderId: orderRow.id, reference };
}
