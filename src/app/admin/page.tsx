import Link from "next/link";
import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { canOperatePlatform } from "@/lib/auth/platform";
import { countAccountCatalogs } from "@/lib/billing/account-access";
import { canPublishNewCatalog } from "@/lib/billing/status";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import type { CatalogRow } from "@/lib/supabase/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { catalogHost, catalogUrl } from "@/app/admin/_lib/urls";

type CatalogScope = "own" | "all";

type CatalogCard = {
  catalog: CatalogRow;
  thumbs: string[];
  itemCount: number;
  orderCount: number;
  viewCount: number;
  ownerEmail: string;
};

type DataClient = Awaited<ReturnType<typeof getServerSupabase>>;

function requestedScope(raw: string | string[] | undefined): CatalogScope {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "all" ? "all" : "own";
}

async function loadCatalogCards(catalogs: CatalogRow[], supabase: DataClient): Promise<CatalogCard[]> {
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

      return { catalog, thumbs, itemCount, orderCount, viewCount, ownerEmail: "" };
    }),
  );
}

async function loadOwnerEmails(accountIds: string[]): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  const unique = [...new Set(accountIds.filter(Boolean))];
  if (unique.length === 0) return emails;

  const service = getServiceClient();
  const [{ data: members }, { data: accounts }] = await Promise.all([
    service.from("account_members").select("account_id, user_id, role").in("account_id", unique),
    service.from("accounts").select("id, order_email").in("id", unique),
  ]);

  const ownerIdByAccount = new Map<string, string>();
  for (const row of members ?? []) {
    if (row.role === "owner" || !ownerIdByAccount.has(row.account_id)) {
      ownerIdByAccount.set(row.account_id, row.user_id);
    }
  }

  const emailByUser = new Map<string, string>();
  await Promise.all(
    [...new Set(ownerIdByAccount.values())].map(async (userId) => {
      const { data } = await service.auth.admin.getUserById(userId);
      const email = data.user?.email?.toLowerCase();
      if (email) emailByUser.set(userId, email);
    }),
  );

  for (const accountId of unique) {
    const ownerId = ownerIdByAccount.get(accountId);
    const fallback = (accounts ?? []).find((row) => row.id === accountId)?.order_email ?? "";
    emails.set(accountId, (ownerId && emailByUser.get(ownerId)) || fallback.toLowerCase());
  }
  return emails;
}

export default async function CatalogsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string | string[] }>;
}) {
  const query = await searchParams;
  const account = await requireAccount();
  const user = await getSessionUser();
  const isOperator = canOperatePlatform(user?.email);
  const scope: CatalogScope = isOperator && requestedScope(query.scope) === "all" ? "all" : "own";

  let newInquiryCount = 0;
  if (isOperator) {
    const { count } = await getServiceClient()
      .from("setup_inquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "new");
    newInquiryCount = count ?? 0;
  }

  // Own always uses the signed-in JWT + account_id (RLS). All is service-role
  // and only after the operator gate — merchants cannot request it.
  let catalogs: CatalogRow[] = [];
  let catalogsError = false;
  let cards: CatalogCard[] = [];

  if (scope === "all") {
    const service = getServiceClient();
    const { data, error } = await service
      .from("catalogs")
      .select("*")
      .order("created_at", { ascending: false });
    catalogsError = Boolean(error);
    catalogs = error ? [] : ((data ?? []) as CatalogRow[]);
    const [loaded, owners] = await Promise.all([
      loadCatalogCards(catalogs, service),
      loadOwnerEmails(catalogs.map((row) => row.account_id)),
    ]);
    cards = loaded.map((card) => ({
      ...card,
      ownerEmail: owners.get(card.catalog.account_id) ?? "",
    }));
  } else {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("catalogs")
      .select("*")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false });
    catalogsError = Boolean(error);
    catalogs = error ? [] : ((data ?? []) as CatalogRow[]);
    cards = await loadCatalogCards(catalogs, supabase);
  }

  const liveCount = cards.filter((c) => c.catalog.status === "live").length;
  const catalogCount = scope === "own" ? cards.length : await countAccountCatalogs(account.id);
  const canPublish = canPublishNewCatalog(account, { email: user?.email, catalogCount });
  const subtitle =
    scope === "all"
      ? `All shops · ${cards.length} ${cards.length === 1 ? "catalog" : "catalogs"} · ${liveCount} live`
      : `${cards.length} ${cards.length === 1 ? "catalog" : "catalogs"} · ${liveCount} live`;

  return (
    <>
      <PageHeader title="Catalogs" subtitle={subtitle} account={account} />
      <div className="p-4 pb-16 sm:p-8">
        {isOperator ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/ops"
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--cat-border)] bg-white px-4 py-4 sm:px-5"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Platform</p>
                <p className="mt-1 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">
                  Operator desk
                </p>
                <p className="mt-0.5 text-xs text-[var(--cat-muted)]">All catalogs, users, transfers</p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--cat-ink)] px-3.5 py-2 text-xs font-medium text-white">
                Open ops
              </span>
            </Link>
            <Link
              href="/admin/inquiries"
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--cat-border)] bg-white px-4 py-4 sm:px-5"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Setup inbox</p>
                <p className="mt-1 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">
                  {newInquiryCount === 0 ? "No new setup inquiries" : `${newInquiryCount} new setup ${newInquiryCount === 1 ? "inquiry" : "inquiries"}`}
                </p>
                <p className="mt-0.5 text-xs text-[var(--cat-muted)]">We’ll-set-it-up requests from the public form</p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--cat-ink)] px-3.5 py-2 text-xs font-medium text-white">
                Open inbox
              </span>
            </Link>
          </div>
        ) : null}
        {isOperator ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <ScopeChip href="/admin" label="Own" active={scope === "own"} />
            <ScopeChip href="/admin?scope=all" label="All" active={scope === "all"} />
            <p className="m-0 text-xs text-[var(--cat-muted)]">
              {scope === "all" ? "Every shop · owner on each card" : "This account only"}
            </p>
          </div>
        ) : null}
        {catalogsError ? (
          <p className="mb-4 text-[13px] text-[#b2432b]">Could not load catalogs. Refresh and try again.</p>
        ) : null}
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ catalog, thumbs, itemCount, orderCount, viewCount, ownerEmail }, cardIndex) => {
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
                  {scope === "all" && ownerEmail ? (
                    <p className="m-0 mt-1 break-all text-xs text-[var(--cat-ink)]">{ownerEmail}</p>
                  ) : null}
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
              {canPublish ? "Look and address — items later" : "Subscribe to publish a new catalog"}
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}

function ScopeChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] ${
        active
          ? "border-[var(--cat-ink)] bg-[var(--cat-ink)] font-medium text-white"
          : "border-[var(--cat-border)] bg-white text-[var(--cat-muted)]"
      }`}
    >
      {label}
    </Link>
  );
}
