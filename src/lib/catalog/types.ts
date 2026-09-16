// Plain view-model types used by every template renderer and the builder
// preview. Deliberately NOT the same shape as the Supabase rows (see
// src/lib/supabase/types.ts) — this is what a template component consumes,
// whether the data came from Supabase, the builder's in-memory draft, or the
// static seed data.

import type {
  CatalogBanner,
  CheckoutFields,
  CheckoutFormField,
  ImageFit,
  ItemOptionGroup,
  OrderFulfillment,
} from "@/lib/supabase/types";

export type CatalogTemplateKey =
  | "grid"
  | "lookbook"
  | "menu"
  | "pricelist"
  | "cards"
  | "compact"
  | "spotlight";

export interface StorefrontItem {
  /** Stable key for React lists — the DB row id, or a draft-local id in the builder. */
  id: string;
  code: string;
  category: string;
  name: string;
  description: string;
  price: number;
  pack: string;
  /** "" is valid (no photo yet) — every template must render sanely without one. */
  image: string;
  /** Empty = trade-catalog behavior (no size/extras picker). */
  options: ItemOptionGroup[];
  featured: boolean;
  /** False when Admin turns Visible off — shown as Unavailable, not hidden. */
  available: boolean;
  imageFit: ImageFit;
}

export interface StorefrontCatalog {
  id: string;
  name: string;
  slug: string;
  template: CatalogTemplateKey;
  accent: string;
  currency: string;
  checkoutFields: CheckoutFields;
  checkoutForm: CheckoutFormField[];
  fulfillmentModes: OrderFulfillment[];
  /** Public image URL, or "" when the merchant has not set a logo. */
  logo: string;
  tagline: string;
  about: string;
  banners: CatalogBanner[];
  imageFit: ImageFit;
  phone: string;
  address: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  items: StorefrontItem[];
}
