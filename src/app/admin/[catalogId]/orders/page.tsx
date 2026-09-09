import Link from "next/link";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { formatMoney } from "@/lib/catalog/currency";
import { PageHeader } from "@/components/admin/PageHeader";
import type { OrderItemRow, OrderRow } from "@/lib/supabase/types";
import { markOrderConfirmed } from "./actions";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString();
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ catalogId: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const [{ catalogId }, { order: selectedOrderId }] = await Promise.all([params, searchParams]);
  const supabase = await getServerSupabase();

  const [account, catalog, ordersRes] = await Promise.all([
    requireAccount(),
    getCatalogOrNotFound(catalogId),
    supabase.from("orders").select("*").eq("catalog_id", catalogId).order("created_at", { ascending: false }),
  ]);
  const orders = (ordersRes.data ?? []) as OrderRow[];

  const openOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : orders[0];

  let lines: OrderItemRow[] = [];
  if (openOrder) {
    const { data: lineData } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", openOrder.id);
    lines = (lineData ?? []) as OrderItemRow[];
  }

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${catalog.name} · ${orders.length} orders`}
        account={account}
      />
      <div className="grid items-start gap-[18px] p-4 pb-16 sm:p-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-[var(--cat-border)]">
          <div className="flex items-center justify-between border-b border-[var(--cat-border)] px-[18px] py-3.5">
            <span className="text-[13px] font-semibold text-[var(--cat-ink)]">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </span>
            <a
              href={`/admin/${catalogId}/orders/export`}
              className="rounded-lg border border-[#d2d2d7] bg-white px-3 py-1.5 text-xs font-medium text-[var(--cat-ink)]"
            >
              Export CSV
            </a>
          </div>
          {orders.length === 0 ? (
            <p className="p-[18px] text-xs text-[var(--cat-muted)]">No orders yet.</p>
          ) : (
            orders.map((order) => {
              const isOpen = openOrder?.id === order.id;
              return (
                <Link
                  key={order.id}
                  href={`/admin/${catalogId}/orders?order=${order.id}`}
                  className={`flex items-center justify-between gap-3 border-b border-[#f0f0f4] px-[18px] py-3.5 last:border-b-0 ${
                    isOpen ? "bg-[var(--cat-photo-bg)]" : "bg-white"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-[var(--cat-ink)]">
                      {order.shop_name}
                    </span>
                    <span className="block truncate text-xs text-[#86868b]">
                      {order.reference} · {formatWhen(order.created_at)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-[var(--cat-ink)]">
                    {formatMoney(Number(order.subtotal), catalog.currency)}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {openOrder ? (
          <div className="rounded-2xl border border-[var(--cat-border)] p-[22px]">
            <div className="flex items-baseline justify-between">
              <h3 className="m-0 text-[17px] font-semibold tracking-tight text-[var(--cat-ink)]">
                {openOrder.reference}
              </h3>
              <span className="text-xs text-[#86868b]">{formatWhen(openOrder.created_at)}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--cat-muted)]">Shop</span>
                <span className="font-medium text-[var(--cat-ink)]">{openOrder.shop_name}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--cat-muted)]">Phone</span>
                <span className="font-medium text-[var(--cat-ink)]">{openOrder.phone}</span>
              </div>
              <div className="flex justify-between gap-6 text-[13px]">
                <span className="text-[var(--cat-muted)]">Location</span>
                <span className="text-right font-medium text-[var(--cat-ink)]">{openOrder.location}</span>
              </div>
              {openOrder.notes ? (
                <div className="flex justify-between gap-6 text-[13px]">
                  <span className="text-[var(--cat-muted)]">Notes</span>
                  <span className="text-right font-medium text-[var(--cat-ink)]">{openOrder.notes}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--cat-muted)]">Status</span>
                <span className="font-medium text-[var(--cat-ink)] capitalize">{openOrder.status}</span>
              </div>
            </div>

            <div className="mt-5 border-t border-[#f0f0f4]">
              {lines.length === 0 ? (
                <p className="py-3 text-xs text-[var(--cat-muted)]">No line items on this order.</p>
              ) : (
                lines.map((line) => (
                  <div key={line.id} className="flex items-center gap-3 border-b border-[#f0f0f4] py-3">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[13px] font-medium text-[var(--cat-ink)]">{line.name}</p>
                      <p className="m-0 mt-0.5 text-xs text-[#86868b]">
                        {line.code} · {formatMoney(Number(line.price), catalog.currency)} × {line.qty}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold text-[var(--cat-ink)]">
                      {formatMoney(Number(line.line_total), catalog.currency)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-between text-[16px] font-semibold text-[var(--cat-ink)]">
              <span>Total</span>
              <span>{formatMoney(Number(openOrder.subtotal), catalog.currency)}</span>
            </div>

            <div className="mt-5 flex gap-2">
              <form action={markOrderConfirmed.bind(null, catalogId, openOrder.id)} className="flex-1">
                <button
                  type="submit"
                  disabled={openOrder.status === "confirmed"}
                  className="w-full rounded-[10px] bg-[var(--cat-ink)] py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  {openOrder.status === "confirmed" ? "Confirmed" : "Mark confirmed"}
                </button>
              </form>
              <a
                href={`tel:${openOrder.phone}`}
                className="flex-1 rounded-[10px] border border-[#d2d2d7] bg-white py-2.5 text-center text-[13px] font-medium text-[var(--cat-ink)]"
              >
                Call shop
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--cat-border)] p-[22px] text-xs text-[var(--cat-muted)]">
            No orders yet.
          </div>
        )}
      </div>
    </>
  );
}
