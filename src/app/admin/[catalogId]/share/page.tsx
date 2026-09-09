import { requireAccount } from "@/lib/auth/current-account";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { catalogHost, catalogUrl } from "@/app/admin/_lib/urls";
import { PageHeader } from "@/components/admin/PageHeader";
import { ShareCardsClient } from "./ShareCardsClient";

export default async function SharePage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const [account, catalog] = await Promise.all([requireAccount(), getCatalogOrNotFound(catalogId)]);

  return (
    <>
      <PageHeader
        title="Share"
        subtitle={`Print a QR card for ${catalog.name}`}
        account={account}
      />
      <div className="p-4 pb-16 print:p-0 sm:p-8">
        <ShareCardsClient
          catalogName={catalog.name}
          url={catalogUrl(catalog.slug)}
          host={catalogHost(catalog.slug)}
          accent={catalog.accent}
        />
      </div>
    </>
  );
}
