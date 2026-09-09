import Link from "next/link";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { catalogUrl } from "@/app/admin/_lib/urls";
import { formatMoney } from "@/lib/catalog/currency";
import { templateMeta } from "@/lib/catalog/templates";
import { PageHeader } from "@/components/admin/PageHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { QrCodeButton } from "@/components/admin/QrCodeButton";
import { LookSettingsForm } from "./LookSettingsForm";
import { parseCheckoutFields } from "@/lib/catalog/checkout-fields";
import type { OrderRow } from "@/lib/supabase/types";

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function CatalogDashboardPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const { catalogId } = await params;
  const account = await requireAccount();
  const catalog = await getCatalogOrNotFound(catalogId);
  const supabase = await getServerSupabase();

  const [
    viewsThisMonthRes,
    ordersRes,
    itemsCountRes,
    visibleItemsCountRes,
    recentOrdersRes,
    allOrderIdsRes,
    catalogItemsRes,
  ] = await Promise.all([
    supabase
      .from("catalog_views")
      .select("*", { count: "exact", head: true })
      .eq("catalog_id", catalogId)
      .gte("created_at", startOfMonthIso()),
    supabase.from("orders").select("subtotal").eq("catalog_id", catalogId),
    supabase
      .from("catalog_items")
      .select("*", { count: "exact", head: true })
      .eq("catalog_id", catalogId),
    supabase
      .from("catalog_items")
      .select("*", { count: "exact", head: true })
      .eq("catalog_id", catalogId)
      .eq("visible", true),
    supabase
      .from("orders")
      .select("*")
      .eq("catalog_id", catalogId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("orders").select("id").eq("catalog_id", catalogId),
    supabase.from("catalog_items").select("code, image").eq("catalog_id", catalogId),
  ]);

  const loadFailed = Boolean(
    viewsThisMonthRes.error ||
      ordersRes.error ||
      itemsCountRes.error ||
      recentOrdersRes.error,
  );
  const viewsThisMonth = viewsThisMonthRes.count ?? 0;
  const orders = ordersRes.data ?? [];
  const orderCount = orders.length;
  const orderValue = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const itemCount = itemsCountRes.count ?? 0;
  const visibleItemCount = visibleItemsCountRes.count ?? 0;
  const recentOrders = (recentOrdersRes.data ?? []) as OrderRow[];

  const imageByCode = new Map((catalogItemsRes.data ?? []).map((row) => [row.code, row.image]));
  const qtyByCode = new Map<string, { name: string; qty: number }>();
  const allOrderIds = (allOrderIdsRes.data ?? []).map((o) => o.id);
  if (allOrderIds.length > 0) {
    const { data: lines } = await supabase
      .from("order_items")
      .select("code, name, qty")
      .in("order_id", allOrderIds);
    for (const line of lines ?? []) {
      const existing = qtyByCode.get(line.code);
      if (existing) {
        existing.qty += line.qty;
      } else {
        qtyByCode.set(line.code, { name: line.name, qty: line.qty });
      }
    }
  }
  const topItems = Array.from(qtyByCode.entries())
    .map(([code, v]) => ({ code, name: v.name, qty: v.qty, image: imageByCode.get(code) ?? "" }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);
  const maxQty = topItems[0]?.qty ?? 1;

  const url = catalogUrl(catalog.slug);
  const template = templateMeta(catalog.template);

  const stats = [
    { label: "Views this month", value: viewsThisMonth.toLocaleString(), note: "So far this month" },
    { label: "Orders", value: orderCount.toLocaleString(), note: `${orderCount} total` },
    { label: "Order value", value: formatMoney(orderValue, catalog.currency), note: `Across ${orderCount} orders` },
    {
      label: "Items",
      value: itemCount.toLocaleString(),
      note: itemCount === visibleItemCount ? "All visible" : `${visibleItemCount} visible`,
    },
  ];

  return (
    <>
      <PageHeader
        title={catalog.name}
        subtitle={`${catalog.status === "live" ? "Live" : "Draft"} · ${itemCount} items · ${template.name} template`}
        account={account}
      />
      <div className="flex flex-col gap-6 p-4 pb-16 sm:p-8">
        {loadFailed ? (
          <p className="text-[13px] text-[#b2432b]">Could not load every dashboard figure. Refresh and try again.</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--cat-border)] p-5">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">Live at</p>
            <p className="m-0 mt-1.5 text-[18px] font-semibold tracking-tight text-[var(--cat-ink)]">
              {url.replace(/^https?:\/\//, "")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton url={url} />
            <QrCodeButton url={url} />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[var(--cat-accent)] px-4 py-2 text-[13px] font-medium text-white"
            >
              View catalog
            </a>
          </div>
        </div>

        <LookSettingsForm
          catalogId={catalogId}
          template={catalog.template}
          accent={catalog.accent}
          checkoutFields={parseCheckoutFields(catalog.checkout_fields)}
        />

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-[var(--cat-photo-bg)] p-5">
              <p className="m-0 text-xs text-[var(--cat-muted)]">{stat.label}</p>
              <p className="m-0 mt-2 text-[30px] font-semibold tracking-tight text-[var(--cat-ink)]">
                {stat.value}
              </p>
              <p className="m-0 mt-1 text-xs text-[#86868b]">{stat.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-[18px] lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--cat-border)] p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="m-0 text-[15px] font-semibold text-[var(--cat-ink)]">Recent orders</h3>
              <Link href={`/admin/${catalogId}/orders`} className="text-xs text-[var(--cat-accent)]">
                Open inbox
              </Link>
            </div>
            <div className="mt-3.5 flex flex-col">
              {recentOrders.length === 0 ? (
                <p className="py-3 text-[13px] text-[var(--cat-muted)]">
                  No orders yet. They will show up here when a shop places one.
                </p>
              ) : (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/${catalogId}/orders?order=${order.id}`}
                    className="flex items-center justify-between gap-3 border-t border-[#f0f0f4] py-3 text-left first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-[var(--cat-ink)]">
                        {order.shop_name}
                      </span>
                      <span className="block text-xs text-[#86868b]">{order.reference}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-[var(--cat-ink)]">
                      {formatMoney(Number(order.subtotal), catalog.currency)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--cat-border)] p-5">
            <h3 className="m-0 text-[15px] font-semibold text-[var(--cat-ink)]">Most ordered items</h3>
            <div className="mt-3.5 flex flex-col gap-3">
              {topItems.length === 0 ? (
                <p className="text-[13px] text-[var(--cat-muted)]">
                  No orders yet. Most-ordered items will rank here.
                </p>
              ) : (
                topItems.map((item) => (
                  <div key={item.code} className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--cat-photo-bg)]">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-provided image URLs
                        <img src={item.image} alt="" className="h-full w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[13px] font-medium text-[var(--cat-ink)]">{item.name}</p>
                      <div className="mt-1.5 h-1 rounded-full bg-[#f0f0f4]">
                        <div
                          className="h-1 rounded-full bg-[var(--cat-accent)]"
                          style={{ width: `${Math.max(6, (item.qty / maxQty) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--cat-muted)]">{item.qty} units</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
