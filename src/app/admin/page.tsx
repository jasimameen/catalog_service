import Link from "next/link";
import { requireAccount } from "@/lib/auth/current-account";
import { canPublishNewCatalog } from "@/lib/billing/status";
import { getServerSupabase } from "@/lib/supabase/server";
import type { CatalogRow } from "@/lib/supabase/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { catalogHost, catalogUrl } from "@/app/admin/_lib/urls";

async function loadCatalogCards(catalogs: CatalogRow[]) {
  const supabase = await getServerSupabase();

  return Promise.all(
    catalogs.map(async (catalog) => {
      const [thumbsRes, itemsCountRes, ordersCountRes, viewsCountRes] = await Promise.all([
        supabase
          .from("catalog_items")
          .select("image")
          .eq("catalog_id", catalog.id)
          .order("position", { ascending: true })
          .limit(6),
        supabase
          .from("catalog_items")
          .select("*", { count: "exact", head: true })
          .eq("catalog_id", catalog.id),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("catalog_id", catalog.id),
        supabase
          .from("catalog_views")
          .select("*", { count: "exact", head: true })
          .eq("catalog_id", catalog.id),
      ]);

      const thumbs = (thumbsRes.data ?? []).map((row) => row.image).filter(Boolean);
      const itemCount = itemsCountRes.count ?? 0;
      const orderCount = ordersCountRes.count ?? 0;
      const viewCount = viewsCountRes.count ?? 0;

      return { catalog, thumbs, itemCount, orderCount, viewCount };
    }),
  );
}

export default async function CatalogsPage() {
  const account = await requireAccount();
  const supabase = await getServerSupabase();

  const { data: catalogs, error: catalogsError } = await supabase
    .from("catalogs")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  const cards = catalogsError ? [] : await loadCatalogCards((catalogs ?? []) as CatalogRow[]);
  const liveCount = cards.filter((c) => c.catalog.status === "live").length;
  const canPublish = canPublishNewCatalog(account);

  return (
    <>
      <PageHeader
        title="Catalogs"
        subtitle={`${cards.length} ${cards.length === 1 ? "catalog" : "catalogs"} · ${liveCount} live`}
        account={account}
      />
      <div className="p-4 pb-16 sm:p-8">
        {catalogsError ? (
          <p className="mb-4 text-[13px] text-[#b2432b]">Could not load catalogs. Refresh and try again.</p>
        ) : null}
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ catalog, thumbs, itemCount, orderCount, viewCount }, cardIndex) => {
            const isLive = catalog.status === "live";
            const meta = isLive
              ? `${itemCount} items · ${orderCount} orders · ${viewCount} views`
              : `${itemCount} items · not published`;

            return (
              <div
                key={catalog.id}
                className="overflow-hidden rounded-[18px] border border-[var(--cat-border)] bg-white"
              >
                <div
                  className="grid aspect-[16/10] grid-cols-3 gap-1.5 bg-[var(--cat-photo-bg)] p-3.5"
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const image = thumbs[i];
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center overflow-hidden rounded-lg bg-white"
                      >
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-provided image URLs
                          <img
                            src={image}
                            alt=""
                            width={160}
                            height={120}
                            loading={cardIndex === 0 ? "eager" : "lazy"}
                            decoding="async"
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="p-[18px] pt-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ background: isLive ? "#1e9e4a" : "#c7c7cc" }}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
                      {isLive ? "Live" : "Draft"}
                    </span>
                  </div>
                  <h3 className="m-0 mb-0.5 mt-2 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">
                    {catalog.name}
                  </h3>
                  <p className="m-0 text-xs text-[var(--cat-muted)]">{catalogHost(catalog.slug)}</p>
                  <p className="m-0 mt-3 text-xs text-[var(--cat-muted)]">{meta}</p>
                  <div className="mt-3.5 flex gap-2">
                    <Link
                      href={`/admin/${catalog.id}`}
                      className="flex-1 rounded-lg bg-[var(--cat-ink)] py-2 text-center text-xs font-medium text-white"
                    >
                      Dashboard
                    </Link>
                    <CopyLinkButton
                      url={catalogUrl(catalog.slug)}
                      className="flex-1 rounded-lg border border-[#d2d2d7] bg-white py-2 text-center text-xs font-medium text-[var(--cat-ink)]"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Link
            href={canPublish ? "/new" : "/admin/settings"}
            className="flex min-h-[260px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-[#d2d2d7] text-[var(--cat-muted)]"
          >
            <span className="text-[28px] font-light text-[var(--cat-ink)]">+</span>
            <span className="text-[13px] font-medium text-[var(--cat-ink)]">New catalog</span>
            <span className="text-xs">
              {canPublish ? "Three steps, about five minutes" : "Subscribe to publish a new catalog"}
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
