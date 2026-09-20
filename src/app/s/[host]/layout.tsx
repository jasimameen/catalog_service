import type { ReactNode } from "react";
import type { Metadata } from "next";
import { loadStorefrontCatalog } from "@/lib/catalog/load-storefront";
import { storefrontMetadata } from "@/lib/seo/catalog-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}): Promise<Metadata> {
  const { host } = await params;
  const catalog = await loadStorefrontCatalog(host);
  return storefrontMetadata(catalog);
}

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return children;
}
