import type { Metadata } from "next";
import { loadStorefrontCatalog } from "@/lib/catalog/load-storefront";
import { firstQueryValue } from "@/lib/catalog/storefront-paths";
import { storefrontMetadata } from "@/lib/seo/catalog-meta";
import { DineStorefront } from "./DineStorefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}): Promise<Metadata> {
  const { host } = await params;
  return storefrontMetadata(await loadStorefrontCatalog(host), { titleExtra: "Dine-in" });
}

export default async function DinePage({
  params,
  searchParams,
}: {
  params: Promise<{ host: string }>;
  searchParams: Promise<{ table?: string | string[] }>;
}) {
  const { host } = await params;
  const query = await searchParams;
  return <DineStorefront host={host} table={firstQueryValue(query.table)} />;
}
