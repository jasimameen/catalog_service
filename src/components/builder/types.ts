import type { CatalogTemplateKey } from "@/lib/catalog/types";

/** In-memory draft item — never written to Supabase until publish, at which
 *  point it's mapped to a `catalog_items` insert row (see src/app/new/actions.ts). */
export interface DraftItem {
  tempId: string;
  name: string;
  price: number;
  /** "" (no photo), a pasted URL, or a small data: URL preview. */
  image: string;
}

export type { CatalogTemplateKey };
