import { requireAccount } from "@/lib/auth/current-account";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { catalogDineUrl, catalogHost, catalogUrl } from "@/app/admin/_lib/urls";
import { parseFulfillmentModes } from "@/lib/catalog/checkout-form";
import { parseTemplateSettings } from "@/lib/catalog/template-settings";
import { PageHeader } from "@/components/admin/PageHeader";
import { ShareCardsClient } from "./ShareCardsClient";

export default async function SharePage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const [account, catalog] = await Promise.all([requireAccount(), getCatalogOrNotFound(catalogId)]);
  const showDine = parseFulfillmentModes(catalog.fulfillment_modes).includes("dine_in");
  const settings = parseTemplateSettings(catalog.template_settings);

  return (
    <>
      <PageHeader
        title="Share"
        subtitle={`Print a menu or dine-in QR for ${catalog.name}`}
        account={account}
      />
      <div className="p-4 pb-16 print:p-0 sm:p-8">
        <ShareCardsClient
          catalogName={catalog.name}
          menuUrl={catalogUrl(catalog.slug)}
          dineUrl={catalogDineUrl(catalog.slug)}
          menuHost={catalogHost(catalog.slug)}
          dineHost={`${catalogHost(catalog.slug)}/dine`}
          accent={catalog.accent}
          logo={catalog.logo}
          showDine={showDine}
          dineInQr={settings.restaurant.dineInQr}
        />
      </div>
    </>
  );
}
