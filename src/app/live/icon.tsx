import { loadHarborDemoCatalog } from "@/lib/catalog/load-harbor";
import { catalogIconResponse } from "@/lib/seo/catalog-brand-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const { catalog } = await loadHarborDemoCatalog();
  return catalogIconResponse(catalog, 32);
}
