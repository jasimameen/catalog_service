import { loadHarborDemoCatalog } from "@/lib/catalog/load-harbor";
import { catalogOpenGraphResponse } from "@/lib/seo/catalog-brand-image";

export const alt = "Harbor Kitchen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const { catalog } = await loadHarborDemoCatalog();
  return catalogOpenGraphResponse(catalog);
}
