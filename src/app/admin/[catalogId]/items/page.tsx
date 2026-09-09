import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import type { CatalogItemRow } from "@/lib/supabase/types";
import { ItemsClient } from "./ItemsClient";

export default async function ItemsPage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const account = await requireAccount();
  const catalog = await getCatalogOrNotFound(catalogId);
  const supabase = await getServerSupabase();

  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const items = (data ?? []) as CatalogItemRow[];

  return (
    <>
      <PageHeader title="Items" subtitle={`${catalog.name} · ${items.length} items`} account={account} />
      <div className="p-4 pb-16 sm:p-8">
        <ItemsClient catalogId={catalogId} items={items} currency={catalog.currency} />
      </div>
    </>
  );
}
