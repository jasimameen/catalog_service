import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import type { CatalogItemRow } from "@/lib/supabase/types";
import { ItemsClient } from "./ItemsClient";

export default async function ItemsPage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const supabase = await getServerSupabase();

  const [account, catalog, itemsRes] = await Promise.all([
    requireAccount(),
    getCatalogOrNotFound(catalogId),
    supabase
      .from("catalog_items")
      .select("*")
      .eq("catalog_id", catalogId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  const items = (itemsRes.data ?? []) as CatalogItemRow[];
  const error = itemsRes.error;

  return (
    <>
      <PageHeader title="Items" subtitle={`${catalog.name} · ${items.length} items`} account={account} />
      <div className="p-4 pb-16 sm:p-8">
        {error ? (
          <p className="mb-4 text-[13px] text-[#b2432b]">Could not load items. Refresh and try again.</p>
        ) : null}
        <ItemsClient catalogId={catalogId} items={items} currency={catalog.currency} />
      </div>
    </>
  );
}
