import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import { getRootDomain } from "@/lib/tenant";
import { getExpectedCnameTarget } from "@/lib/domains/provider";
import type { DomainRow } from "@/lib/supabase/types";
import { DomainsClient } from "./DomainsClient";

export default async function DomainsPage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const account = await requireAccount();
  const catalog = await getCatalogOrNotFound(catalogId);
  const supabase = await getServerSupabase();

  const { data } = await supabase
    .from("domains")
    .select("*")
    .eq("catalog_id", catalogId)
    .eq("kind", "custom")
    .order("created_at", { ascending: true });
  const customDomains = (data ?? []) as DomainRow[];

  return (
    <>
      <PageHeader
        title="Domains"
        subtitle={
          customDomains.length > 0
            ? `One subdomain live, ${customDomains.length} custom ${customDomains.length === 1 ? "domain" : "domains"}`
            : "One subdomain live"
        }
        account={account}
      />
      <div className="p-4 pb-16 sm:p-8">
        <DomainsClient
          catalogId={catalogId}
          slug={catalog.slug}
          rootHost={getRootDomain()}
          cnameTarget={getExpectedCnameTarget()}
          customDomains={customDomains}
        />
      </div>
    </>
  );
}
