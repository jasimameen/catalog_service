import { loadHarborDemoCatalog } from "@/lib/catalog/load-harbor";
import { catalogIconResponse } from "@/lib/seo/catalog-brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const { catalog } = await loadHarborDemoCatalog();
  return catalogIconResponse(catalog, 180);
}
