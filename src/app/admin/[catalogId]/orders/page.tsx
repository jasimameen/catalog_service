import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import type { OrderItemRow, OrderRow } from "@/lib/supabase/types";
import { OrdersBoard } from "./OrdersBoard";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const { catalogId } = await params;
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

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${catalog.name} · kitchen board`}
        account={account}
      />
      <div className="flex flex-col gap-4 p-4 pb-16 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="m-0 text-[13px] text-[var(--cat-muted)]">
            {orders.length} {orders.length === 1 ? "order" : "orders"} · New → Preparing → Ready → Done
          </p>
          <a
            href={`/admin/${catalogId}/orders/export`}
            className="min-h-11 rounded-lg border border-[#d2d2d7] bg-white px-3 text-xs font-medium leading-[44px] text-[var(--cat-ink)]"
          >
            Export CSV
          </a>
        </div>
        <OrdersBoard
          catalogId={catalogId}
          currency={catalog.currency}
          initialOrders={orders}
          initialItems={items}
        />
      </div>
    </>
  );
}
