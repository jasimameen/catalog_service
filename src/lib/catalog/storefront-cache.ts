import { revalidateTag } from "next/cache";

/** Shared tag for published storefront catalog reads (`unstable_cache`). */
export const STOREFRONT_CATALOG_CACHE_TAG = "storefront-catalog";

/** Drop cached storefront catalogs after a publish or catalog edit. */
export function revalidateStorefrontCatalog() {
  revalidateTag(STOREFRONT_CATALOG_CACHE_TAG, { expire: 0 });
}
