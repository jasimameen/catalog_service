import { loadStorefrontCatalog } from "@/lib/catalog/load-storefront";
import { catalogOpenGraphResponse } from "@/lib/seo/catalog-brand-image";

export const alt = "Catalog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const catalog = await loadStorefrontCatalog(host);
  return catalogOpenGraphResponse(catalog);
}
