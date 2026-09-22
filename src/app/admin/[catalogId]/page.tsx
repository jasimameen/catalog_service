import Link from "next/link";
import { requireAccount } from "@/lib/auth/current-account";
import { getCatalogAdminClient, getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { catalogUrl } from "@/app/admin/_lib/urls";
import { formatMoney } from "@/lib/catalog/currency";
import { isTerminalStatus, parseOrderStatuses } from "@/lib/catalog/order-statuses";
import { PageHeader } from "@/components/admin/PageHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { LookSettingsForm } from "./LookSettingsForm";
import { HoursCard } from "./HoursCard";
import { BranchesCard } from "./BranchesCard";
import { canPublishNewCatalog } from "@/lib/billing/status";
import { LiveRecentOrders } from "./LiveRecentOrders";
import { LiveRecentReservations } from "./LiveRecentReservations";
import { OrderingCard } from "@/components/admin/OrderingCard";
import { FloorPlanCard } from "@/components/admin/FloorPlanCard";
import { FloorPlanSettings } from "./FloorPlanSettings";
import { DayOpsStrip } from "./DayOpsStrip";
import { SettingsHub } from "./SettingsHub";
import { DiscoveryCard } from "./DiscoveryCard";
import { PlaceContactCard } from "./PlaceContactCard";
import { DangerCard } from "./DangerCard";
import { reservationTone } from "@/lib/catalog/reservation-status";
import { parseCheckoutFields } from "@/lib/catalog/checkout-fields";
import { parseCheckoutForm, parseFulfillmentModes } from "@/lib/catalog/checkout-form";
import {
  catalogOffersFloorSettings,
  isFloorPlanEnabled,
  parseTemplateSettings,
} from "@/lib/catalog/template-settings";
import { planStats } from "@/lib/catalog/floor-plan";
import { parseBanners, parseImageFit } from "@/lib/catalog/merchandising";
import { parseCoord, parseLocations } from "@/lib/catalog/locations";
import type { OrderRow, ReservationRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

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
  const supabase = await getCatalogAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);

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
    reservationsRes,
    todayReservationsRes,
    ownerAccountRes,
  ] = await Promise.all([
    requireAccount(),
    getCatalogOrNotFound(catalogId),
    supabase
      .from("catalog_views")
      .select("*", { count: "exact", head: true })
      .eq("catalog_id", catalogId)
      .gte("created_at", startOfMonthIso()),
    supabase.from("orders").select("subtotal, status").eq("catalog_id", catalogId),
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
    supabase
      .from("reservations")
      .select("*")
      .eq("catalog_id", catalogId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("reservations")
      .select("status, day")
      .eq("catalog_id", catalogId)
      .eq("day", todayIso),
    supabase
      .from("accounts")
      .select("ls_status, trial_ends_at")
      .eq("id", (await getCatalogOrNotFound(catalogId)).account_id)
      .maybeSingle(),
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
  const recentReservations = (reservationsRes.data ?? []) as ReservationRow[];
  const canAddShop = canPublishNewCatalog(ownerAccountRes.data ?? account);
  const locations = parseLocations(catalog.locations);
  const settings = parseTemplateSettings(catalog.template_settings);
  const showReservations = settings.restaurant.enableReserve || recentReservations.length > 0;
  const showFloor = isFloorPlanEnabled(settings);
  const showFloorSettings = catalogOffersFloorSettings(catalog.template, settings);
  const floorStats = planStats({ floors: settings.floor.floors });
  const acceptOrders = catalog.accept_orders !== false;
  const showAlert = catalog.show_storefront_alert === true;
  const isLive = catalog.status === "live";
  const statuses = parseOrderStatuses(catalog.order_statuses);
  const openTickets = (ordersRes.data ?? []).filter(
    (row) => !isTerminalStatus(String((row as { status?: string }).status ?? ""), statuses),
  ).length;
  const bookedToday = (todayReservationsRes.data ?? []).filter(
    (row) => reservationTone(row.status) === "booked",
  ).length;

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

  function panels(embedded: boolean) {
    return {
      hours: (
        <HoursCard
          catalogId={catalogId}
          hours={catalog.hours ?? ""}
          showHours={catalog.show_hours !== false}
          embedded={embedded}
        />
      ),
      contact: (
        <PlaceContactCard
          catalogId={catalogId}
          phone={catalog.phone ?? ""}
          email={catalog.email ?? ""}
          address={catalog.address ?? ""}
          whatsapp={catalog.whatsapp ?? ""}
          instagram={catalog.instagram ?? ""}
          geoLat={parseCoord(catalog.geo_lat)}
          geoLng={parseCoord(catalog.geo_lng)}
          showContact={catalog.show_contact !== false}
          showSocial={catalog.show_social !== false}
          showMap={Boolean(catalog.show_map)}
          embedded={embedded}
        />
      ),
      locations: (
        <BranchesCard
          catalogId={catalogId}
          catalogName={catalog.name}
          locations={locations}
          embedded={embedded}
        />
      ),
      floor: showFloorSettings ? (
        <FloorPlanSettings
          catalogId={catalogId}
          enabled={showFloor}
          tableCount={floorStats.tables}
          coverCount={floorStats.covers}
          embedded={embedded}
        />
      ) : null,
      ordering: (
        <OrderingCard
          catalogId={catalogId}
          fulfillmentModes={parseFulfillmentModes(catalog.fulfillment_modes)}
          checkoutFields={parseCheckoutFields(catalog.checkout_fields)}
          checkoutForm={parseCheckoutForm(catalog.checkout_form)}
          template={catalog.template}
          templateSettings={parseTemplateSettings(catalog.template_settings)}
          acceptOrders={acceptOrders}
          ordersPausedMessage={catalog.orders_paused_message ?? ""}
          storefrontAlert={catalog.storefront_alert ?? ""}
          showStorefrontAlert={showAlert}
          orderEmail={catalog.order_email ?? ""}
          catalogAddress={catalog.address ?? ""}
          embedded={embedded}
        />
      ),
      look: (
        <LookSettingsForm
          catalogId={catalogId}
          catalogName={catalog.name}
          template={catalog.template}
          accent={catalog.accent}
          logo={catalog.logo ?? ""}
          banners={parseBanners(catalog.banners)}
          imageFit={parseImageFit(catalog.image_fit)}
          placeholderImageUrl={catalog.placeholder_image_url ?? ""}
          templateSettings={parseTemplateSettings(catalog.template_settings)}
          fulfillmentModes={parseFulfillmentModes(catalog.fulfillment_modes)}
          embedded={embedded}
        />
      ),
      discovery: (
        <DiscoveryCard
          catalogId={catalogId}
          catalogName={catalog.name}
          tagline={catalog.tagline ?? ""}
          about={catalog.about ?? ""}
          logo={catalog.logo ?? ""}
          embedded={embedded}
        />
      ),
      danger: (
        <DangerCard
          catalogId={catalogId}
          catalogName={catalog.name}
          canAddShop={canAddShop}
          subscribeHref="/admin/settings"
          embedded={embedded}
        />
      ),
    };
  }

  return (
    <>
      <PageHeader
        title={catalog.name}
        subtitle={`${isLive ? "Live" : "Draft"} · ${itemCount} items`}
        account={account}
      />
      <div className="flex w-full max-w-[1240px] min-w-0 flex-col gap-3 overflow-x-hidden px-4 pb-[max(3.5rem,calc(env(safe-area-inset-bottom)+2.5rem))] pt-3 sm:px-8">
        {loadFailed ? (
          <p className="text-[13px] text-[#b42318]">
            Could not load every dashboard figure. Refresh and try again.
          </p>
        ) : null}

        <DayOpsStrip
          catalogId={catalogId}
          acceptOrders={acceptOrders}
          kitchenOpen={settings.restaurant.kitchenOpen}
          openTickets={openTickets}
          bookedToday={bookedToday}
        />

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#86868b]">
          <span className="truncate font-mono text-[12px]">{host}</span>
          <CopyLinkButton url={url} className="ops-press min-h-9 bg-transparent px-0 text-[13px] text-[#5a6472]" />
          <Link href={`/admin/${catalogId}/share`} className="ops-press inline-flex min-h-9 items-center text-[13px] text-[#5a6472] no-underline">
            QR
          </Link>
          <a href={url} target="_blank" rel="noreferrer" className="ops-press inline-flex min-h-9 items-center text-[13px] text-[#0b5fce] no-underline">
            View
          </a>
          {showAlert ? <span className="text-[#0b5fce]">Alert on</span> : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <LiveRecentOrders
              catalogId={catalogId}
              currency={catalog.currency}
              initialOrders={recentOrders}
              statuses={statuses}
            />
            {showReservations ? (
              <LiveRecentReservations catalogId={catalogId} initial={recentReservations} />
            ) : null}
          </div>

          <section className="min-w-0 flex-1 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,23,32,0.04)]">
            <div className="px-4 py-3.5 text-[15px] font-semibold tracking-tight sm:px-[18px]">
              Most ordered
            </div>
            <div className="flex flex-col px-4 pb-3.5 pt-0 sm:px-[18px]">
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

        {showFloor ? <FloorPlanCard catalogId={catalogId} settings={settings} /> : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[12px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,23,32,0.04)]">
              <p className="m-0 text-[11px] text-[#86868b]">{stat.label}</p>
              <p className="m-0 mt-1 text-[17px] font-semibold tracking-tight tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>

        <SettingsHub desktop={panels(false)} mobile={panels(true)} />
      </div>
    </>
  );
}
