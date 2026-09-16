import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import type { ItemThumb } from "@/lib/catalog/combos";
import { parseFulfillmentModes, resolveCheckoutForm } from "@/lib/catalog/checkout-form";
import { parseCheckoutFields } from "@/lib/catalog/checkout-fields";
import {
  findDuplicateRefs,
  parseDefaultOrderStatus,
  parseOrderStatuses,
  parseStatusFilterParam,
} from "@/lib/catalog/order-statuses";
import type { OrderItemRow, OrderRow, OrderStatusEventRow } from "@/lib/supabase/types";
import { OrdersBoard } from "./OrdersBoard";
import { StatusSettings } from "./StatusSettings";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ catalogId: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { catalogId } = await params;
  const query = await searchParams;
  const supabase = await getServerSupabase();

  const [account, catalog, ordersRes] = await Promise.all([
    requireAccount(),
    getCatalogOrNotFound(catalogId),
    supabase.from("orders").select("*").eq("catalog_id", catalogId).order("created_at", { ascending: false }),
  ]);
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
  const showFulfillment = parseFulfillmentModes(catalog.fulfillment_modes).length > 0;
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

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${catalog.name} · ${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
        account={account}
      />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col px-4 pb-14 pt-4">
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
        >
          <StatusSettings
            key={`${defaultStatusId}:${statuses.map((row) => `${row.id}:${row.label}:${row.is_done}`).join("|")}`}
            catalogId={catalogId}
            initialStatuses={statuses}
            initialDefaultId={defaultStatusId}
            usedCounts={usedCounts}
          />
        </OrdersBoard>
      </div>
    </>
  );
}
