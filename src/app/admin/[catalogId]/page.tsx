import Link from "next/link";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { catalogUrl } from "@/app/admin/_lib/urls";
import { formatMoney } from "@/lib/catalog/currency";
import { templateMeta } from "@/lib/catalog/templates";
import { parseOrderStatuses } from "@/lib/catalog/order-statuses";
import { PageHeader } from "@/components/admin/PageHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { LookSettingsForm } from "./LookSettingsForm";
import { LiveRecentOrders } from "./LiveRecentOrders";
import { OrderingCard } from "@/components/admin/OrderingCard";
import { parseCheckoutFields } from "@/lib/catalog/checkout-fields";
import { parseCheckoutForm, parseFulfillmentModes } from "@/lib/catalog/checkout-form";
import { parseBanners, parseImageFit } from "@/lib/catalog/merchandising";
import { locationsToText, parseCoord, parseLocations } from "@/lib/catalog/locations";
import type { OrderRow } from "@/lib/supabase/types";
import { dashBtnGhost, dashBtnPrimary, dashCard, dashKicker } from "@/components/admin/dashboard/styles";

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
  const supabase = await getServerSupabase();

  const [
    account,
    catalog,
    viewsThisMonthRes,
    ordersRes,
    itemsCountRes,
    visibleItemsCountRes,
    recentOrdersRes,
    allOrderIdsRes,
    catalogItemsRes,
  ] = await Promise.all([
    requireAccount(),
    getCatalogOrNotFound(catalogId),
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
  const extraFieldCount = parseCheckoutForm(catalog.checkout_form).length;
  const acceptOrders = catalog.accept_orders !== false;
  const showAlert = catalog.show_storefront_alert === true;
  const isLive = catalog.status === "live";
  const statuses = parseOrderStatuses(catalog.order_statuses);

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
  const host = url.replace(/^https?:\/\//, "");
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
        subtitle={`${isLive ? "Live · public" : "Draft · not public"} · ${itemCount} items · ${template.name}`}
        account={account}
      />
      <div className="flex w-full max-w-[1240px] min-w-0 flex-col gap-3.5 overflow-x-hidden px-4 pb-[max(3.5rem,calc(env(safe-area-inset-bottom)+2.5rem))] pt-4 sm:px-8">
        {loadFailed ? (
          <p className="text-[13px] text-[#b42318]">
            Could not load every dashboard figure. Refresh and try again.
          </p>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium ${
              isLive ? "bg-[#dff5e6] text-[#1e9e4a]" : "bg-[#fff3d6] text-[#8a5a00]"
            }`}
          >
            <span
              className={`mr-2 h-1.5 w-1.5 rounded-full ${isLive ? "bg-[#1e9e4a]" : "bg-[#c27c0e]"}`}
            />
            {isLive ? "Live" : "Draft"}
          </span>
          <span
            className={`inline-flex min-h-11 items-center rounded-full px-3 text-[13px] ${
              acceptOrders ? "bg-[#eef1f5] text-[#46505e]" : "bg-[#fff3d6] text-[#8a5a00]"
            }`}
          >
            {acceptOrders ? "Taking orders" : "Orders paused"}
          </span>
          {showAlert ? (
            <span className="inline-flex min-h-11 items-center rounded-full bg-[#eef4fd] px-3 text-[13px] text-[#0b5fce]">
              Storefront alert on
            </span>
          ) : null}
          <a
            href="#look"
            className="inline-flex min-h-11 items-center px-2 text-[13px] text-[#5a6472] no-underline hover:text-[#0b5fce]"
          >
            Look
          </a>
          <a
            href="#ordering"
            className="inline-flex min-h-11 items-center px-2 text-[13px] text-[#5a6472] no-underline hover:text-[#0b5fce]"
          >
            Ordering
          </a>
          <Link
            href={`/admin/${catalogId}/orders`}
            className="inline-flex min-h-11 items-center px-2 text-[13px] text-[#5a6472] no-underline hover:text-[#0b5fce]"
          >
            Inbox
          </Link>
        </div>

        <section className={`${dashCard} flex flex-wrap items-center gap-3.5 px-4 py-4 sm:px-[18px]`}>
          <div className="min-w-0 flex-1 basis-[240px]">
            <p className={`m-0 ${dashKicker}`}>{isLive ? "Live at" : "Preview at"}</p>
            <p className="m-0 mt-1 truncate font-mono text-[15px] text-[var(--cat-ink)]">{host}</p>
            {!isLive ? (
              <p className="m-0 mt-1 text-xs text-[#8a93a2]">
                Draft catalogs stay off the public listing. This link still opens a preview.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton url={url} className={dashBtnGhost} />
            <Link href={`/admin/${catalogId}/share`} className={`${dashBtnGhost} no-underline`}>
              Print QR
            </Link>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={`${dashBtnPrimary} no-underline`}
            >
              View catalog
            </a>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${dashCard} px-[17px] py-[15px]`}>
              <p className="m-0 text-xs text-[#5a6472]">{stat.label}</p>
              <p className="m-0 mt-1.5 text-[26px] font-semibold tracking-tight text-[var(--cat-ink)] tabular-nums">
                {stat.value}
              </p>
              <p className="m-0 mt-1 text-xs text-[#8a93a2]">{stat.note}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <LiveRecentOrders
              catalogId={catalogId}
              currency={catalog.currency}
              initialOrders={recentOrders}
              statuses={statuses}
            />
          </div>

          <section className={`${dashCard} min-w-0 flex-1`}>
            <div className="border-b border-[#edf0f4] px-4 py-3.5 text-[15px] font-semibold tracking-tight sm:px-[18px]">
              Most ordered items
            </div>
            <div className="flex flex-col px-4 pb-3.5 pt-1.5 sm:px-[18px]">
              {topItems.length === 0 ? (
                <p className="py-8 text-center text-[13px] leading-relaxed text-[#8a93a2]">
                  No orders yet. Most-ordered items will rank here.
                </p>
              ) : (
                topItems.map((item) => (
                  <div key={item.code} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[#eef1f5] text-[15px] font-semibold text-[#8a93a2]">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-provided image URLs
                        <img
                          src={item.image}
                          alt=""
                          width={40}
                          height={40}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        (item.name.trim()[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[14px] text-[var(--cat-ink)]">{item.name}</p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eef1f5]">
                        <div
                          className="h-full rounded-full bg-[#0b5fce]"
                          style={{ width: `${Math.max(8, (item.qty / maxQty) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-[#5a6472]">
                      {item.qty} units
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <LookSettingsForm
          catalogId={catalogId}
          catalogName={catalog.name}
          extraFieldCount={extraFieldCount}
          template={catalog.template}
          accent={catalog.accent}
          checkoutFields={parseCheckoutFields(catalog.checkout_fields)}
          logo={catalog.logo ?? ""}
          tagline={catalog.tagline ?? ""}
          about={catalog.about ?? ""}
          banners={parseBanners(catalog.banners)}
          imageFit={parseImageFit(catalog.image_fit)}
          phone={catalog.phone ?? ""}
          email={catalog.email ?? ""}
          address={catalog.address ?? ""}
          hours={catalog.hours ?? ""}
          whatsapp={catalog.whatsapp ?? ""}
          instagram={catalog.instagram ?? ""}
          locationsText={locationsToText(parseLocations(catalog.locations))}
          geoLat={parseCoord(catalog.geo_lat)}
          geoLng={parseCoord(catalog.geo_lng)}
          placeholderImageUrl={catalog.placeholder_image_url ?? ""}
          showHours={catalog.show_hours !== false}
          showContact={catalog.show_contact !== false}
          showSocial={catalog.show_social !== false}
          showMap={Boolean(catalog.show_map)}
        />

        <OrderingCard
          catalogId={catalogId}
          fulfillmentModes={parseFulfillmentModes(catalog.fulfillment_modes)}
          checkoutForm={parseCheckoutForm(catalog.checkout_form)}
          acceptOrders={acceptOrders}
          ordersPausedMessage={catalog.orders_paused_message ?? ""}
          storefrontAlert={catalog.storefront_alert ?? ""}
          showStorefrontAlert={showAlert}
        />
      </div>
    </>
  );
}
