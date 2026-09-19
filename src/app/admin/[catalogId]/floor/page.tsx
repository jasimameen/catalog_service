import type { CSSProperties } from "react";
import { requireAccount } from "@/lib/auth/current-account";
import { getCatalogAdminClient, getCatalogOrNotFound } from "@/app/admin/_lib/data";
import { darken } from "@/lib/catalog/color";
import { parseTemplateSettings } from "@/lib/catalog/template-settings";
import type { ServiceRequestRow } from "@/lib/supabase/types";
import { LiveServiceRequests } from "../LiveServiceRequests";
import { FloorEditor } from "./FloorEditor";

export const dynamic = "force-dynamic";

export default async function FloorPage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  const supabase = await getCatalogAdminClient();
  const [account, catalog] = await Promise.all([requireAccount(), getCatalogOrNotFound(catalogId)]);
  void account;
  const settings = parseTemplateSettings(catalog.template_settings);
  const { data: requestRows } = await supabase
    .from("service_requests")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false })
    .limit(20);
  const serviceRequests = ((requestRows ?? []) as ServiceRequestRow[]).filter(
    (row) => row.catalog_id === catalogId,
  );
  const showRequests = settings.restaurant.callWaiter || settings.restaurant.requestBill;

  const accent = catalog.accent || "#0b5fce";
  const theme = {
    "--cat-accent": accent,
    "--cat-accent-dark": darken(accent),
  } as CSSProperties;

  return (
    <div className="flex flex-col bg-[#f4f6f9]" style={theme}>
      <FloorEditor
        catalogId={catalogId}
        catalogName={catalog.name}
        accent={accent}
        slug={catalog.slug}
        initialPlan={{ floors: settings.floor.floors }}
      />
      {showRequests ? (
        <div className="border-t border-[var(--cat-border)] bg-white px-4 py-4">
          <LiveServiceRequests catalogId={catalogId} initial={serviceRequests} />
        </div>
      ) : null}
    </div>
  );
}
