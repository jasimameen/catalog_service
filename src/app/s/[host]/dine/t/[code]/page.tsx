import type { Metadata } from "next";
import { loadStorefrontCatalog } from "@/lib/catalog/load-storefront";
import { storefrontMetadata } from "@/lib/seo/catalog-meta";
import { DineStorefront } from "../../DineStorefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string; code: string }>;
}): Promise<Metadata> {
  const { host, code } = await params;
  const table = decodeURIComponent(code).trim();
  return storefrontMetadata(await loadStorefrontCatalog(host), {
    titleExtra: table ? `Table ${table}` : "Dine-in",
  });
}

export default async function DineTablePage({
  params,
}: {
  params: Promise<{ host: string; code: string }>;
}) {
  const { host, code } = await params;
  return <DineStorefront host={host} table={decodeURIComponent(code).trim()} />;
}
