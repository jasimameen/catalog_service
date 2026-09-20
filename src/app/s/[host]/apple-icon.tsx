import { loadStorefrontCatalog } from "@/lib/catalog/load-storefront";
import { catalogIconResponse } from "@/lib/seo/catalog-brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const catalog = await loadStorefrontCatalog(host);
  return catalogIconResponse(catalog, 180);
}
