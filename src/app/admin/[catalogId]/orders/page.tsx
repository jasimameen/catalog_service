import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import { parseFulfillmentModes } from "@/lib/catalog/checkout-form";
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

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${catalog.name} · ${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
        account={account}
      />
      <div className="flex flex-col gap-4 p-4 pb-16 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-[13px] text-[var(--cat-muted)]">
            Mark each order status as it moves along.
          </p>
          <a
            href={`/admin/${catalogId}/orders/export`}
            className="min-h-11 rounded-lg border border-[#d2d2d7] bg-white px-3 text-xs font-medium leading-[44px] text-[var(--cat-ink)]"
          >
            Export CSV
          </a>
        </div>
        <StatusSettings
          key={`${defaultStatusId}:${statuses.map((row) => `${row.id}:${row.label}:${row.is_done}`).join("|")}`}
          catalogId={catalogId}
          initialStatuses={statuses}
          initialDefaultId={defaultStatusId}
          usedCounts={usedCounts}
        />
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
        />
      </div>
    </>
  );
}
