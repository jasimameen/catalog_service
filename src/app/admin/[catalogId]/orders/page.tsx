import { requireAccount } from "@/lib/auth/current-account";
import { getCatalogAdminClient, getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import type { ItemThumb } from "@/lib/catalog/combos";
import { parseFulfillmentModes, resolveCheckoutForm } from "@/lib/catalog/checkout-form";
import { parseTemplateSettings } from "@/lib/catalog/template-settings";
import { parseCheckoutFields } from "@/lib/catalog/checkout-fields";
import {
  findDuplicateRefs,
  parseDefaultOrderStatus,
  parseOrderStatuses,
  parseStatusFilterParam,
} from "@/lib/catalog/order-statuses";
import type { OrderItemRow, OrderRow, OrderStatusEventRow, ReservationRow } from "@/lib/supabase/types";
import type { ServiceRequestRow } from "@/lib/supabase/types";
import { LiveServiceRequests } from "../LiveServiceRequests";
import { OpsSegment, OpsSegmented } from "@/components/admin/ops/OpsChrome";
import { TypeMark } from "@/components/orders/FulfillmentTypeBadge";
import { OrdersBoard } from "./OrdersBoard";
import { ReservationsInbox } from "./ReservationsInbox";
import { StatusSettings } from "./StatusSettings";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ catalogId: string }>;
  searchParams: Promise<{
    status?: string | string[];
    inbox?: string | string[];
    order?: string | string[];
    reservation?: string | string[];
  }>;
}) {
  const { catalogId } = await params;
  const query = await searchParams;
  const inboxRaw = Array.isArray(query.inbox) ? query.inbox[0] : query.inbox;
  const inbox = inboxRaw === "reservations" ? "reservations" : "orders";
  const openOrderId = Array.isArray(query.order) ? query.order[0] : query.order;
  const openReservationId = Array.isArray(query.reservation) ? query.reservation[0] : query.reservation;
  const supabase = await getCatalogAdminClient();

  const [account, catalog, ordersRes, reservationsRes] = await Promise.all([
    requireAccount(),
    getCatalogOrNotFound(catalogId),
    supabase.from("orders").select("*").eq("catalog_id", catalogId).order("created_at", { ascending: false }),
    supabase.from("reservations").select("*").eq("catalog_id", catalogId).order("created_at", { ascending: false }),
  ]);
  const reservations = (reservationsRes.data ?? []) as ReservationRow[];
  const orders = (ordersRes.data ?? []) as OrderRow[];
  const orderIds = orders.map((o) => o.id);
  const { data: lineData } =
    orderIds.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", orderIds)
      : { data: [] as OrderItemRow[] };
  const items = (lineData ?? []) as OrderItemRow[];
  const { data: eventData } =
    orderIds.length > 0
      ? await supabase.from("order_status_events").select("*").in("order_id", orderIds).order("created_at", { ascending: true })
      : { data: [] as OrderStatusEventRow[] };
  const events = (eventData ?? []) as OrderStatusEventRow[];
  const statuses = parseOrderStatuses(catalog.order_statuses);
  const defaultStatusId = parseDefaultOrderStatus(catalog.default_order_status, statuses);
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const line of items) {
    const list = itemsByOrder.get(line.order_id) ?? [];
    list.push(line);
    itemsByOrder.set(line.order_id, list);
  }
  const duplicates = Object.fromEntries(findDuplicateRefs(orders, itemsByOrder, statuses));
  const usedCounts: Record<string, number> = {};
  for (const order of orders) {
    usedCounts[order.status] = (usedCounts[order.status] ?? 0) + 1;
  }
  const initialFilter = parseStatusFilterParam(query.status, statuses);
  const fulfillmentModes = parseFulfillmentModes(catalog.fulfillment_modes);
  const showFulfillment = fulfillmentModes.length > 0;
  const hasDineIn =
    fulfillmentModes.includes("dine_in") || orders.some((order) => order.fulfillment === "dine_in");
  const settings = parseTemplateSettings(catalog.template_settings);
  const checkoutForm = resolveCheckoutForm(catalog.checkout_form, parseCheckoutFields(catalog.checkout_fields));
  const { data: thumbRows } = await supabase
    .from("catalog_items")
    .select("id, code, name, image")
    .eq("catalog_id", catalogId);
  const thumbs: ItemThumb[] = (thumbRows ?? []).map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    image: String(row.image ?? ""),
  }));
  const { data: requestRows } = await supabase
    .from("service_requests")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false })
    .limit(20);
  const serviceRequests = ((requestRows ?? []) as ServiceRequestRow[]).filter(
    (row) => row.catalog_id === catalogId,
  );

  return (
    <>
      <PageHeader
        title={inbox === "reservations" ? "Reservations" : "Orders"}
        subtitle={
          inbox === "reservations"
            ? `${catalog.name} · ${reservations.length} ${reservations.length === 1 ? "booking" : "bookings"}`
            : `${catalog.name} · what to cook and send out`
        }
        account={account}
      />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col px-4 pb-14 pt-3">
        <div className="mb-2">
          <OpsSegmented label="Inbox">
            <OpsSegment selected={inbox === "orders"} href={`/admin/${catalogId}/orders`}>
              <TypeMark kind="orders" size={14} />
              Orders{orders.length > 0 ? ` ${orders.length}` : ""}
            </OpsSegment>
            <OpsSegment
              selected={inbox === "reservations"}
              href={`/admin/${catalogId}/orders?inbox=reservations`}
            >
              <TypeMark kind="reservation" size={14} />
              Reservations{reservations.length > 0 ? ` ${reservations.length}` : ""}
            </OpsSegment>
          </OpsSegmented>
        </div>
        {inbox === "reservations" ? (
          <ReservationsInbox
            catalogId={catalogId}
            currency={catalog.currency}
            initial={reservations}
            initialOpenId={openReservationId ?? null}
          />
        ) : (
          <OrdersBoard
            catalogId={catalogId}
            currency={catalog.currency}
            showFulfillment={showFulfillment}
            statuses={statuses}
            initialFilter={initialFilter}
            initialOrders={orders}
            initialItems={items}
            initialDuplicates={duplicates}
            initialEvents={events}
            thumbs={thumbs}
            checkoutForm={checkoutForm}
            enableClaim={settings.restaurant.enableClaim}
            hasDineIn={hasDineIn}
            initialOpenId={openOrderId ?? null}
          >
            <LiveServiceRequests catalogId={catalogId} initial={serviceRequests} />
            <StatusSettings
              key={`${defaultStatusId}:${statuses.map((row) => `${row.id}:${row.label}:${row.is_done}`).join("|")}`}
              catalogId={catalogId}
              initialStatuses={statuses}
              initialDefaultId={defaultStatusId}
              usedCounts={usedCounts}
            />
          </OrdersBoard>
        )}
      </div>
    </>
  );
}
