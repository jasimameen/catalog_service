// Hand-written row types matching supabase/schema.sql.
// Regenerate/replace with `supabase gen types typescript` once the project is live, if desired.
//
// These are `type` aliases, not `interface`s, deliberately: `Partial<T>` over
// an `interface` breaks postgrest-js's generic Insert/Update inference (every
// `.insert()`/`.update()` call silently types its argument as `never`, with
// no error at the Database type declaration itself — only at every call
// site). Verified against @supabase/supabase-js 2.116.0 + postgrest-js
// 2.116.0. `type` aliases don't have this problem.

export type CatalogTemplate = "grid" | "lookbook" | "menu" | "pricelist";
export type CatalogStatus = "draft" | "live";
export type DomainKind = "subdomain" | "custom";
export type DomainStatus = "pending" | "verified" | "error";
export type OrderStatus = "new" | "confirmed" | "cancelled";

export type AccountRow = {
  id: string;
  name: string;
  currency: string;
  order_email: string | null;
  order_email_cc: string | null;
  trial_ends_at: string;
  created_at: string;
};

export type AccountMemberRow = {
  account_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};

export type CatalogRow = {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  status: CatalogStatus;
  template: CatalogTemplate;
  accent: string;
  currency: string;
  order_email: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogItemRow = {
  id: string;
  catalog_id: string;
  code: string;
  category: string;
  name: string;
  description: string;
  price: number;
  pack: string;
  image: string;
  position: number;
  visible: boolean;
  barcode: string | null;
  created_at: string;
};

export type DomainRow = {
  id: string;
  catalog_id: string;
  hostname: string;
  kind: DomainKind;
  status: DomainStatus;
  provider_ref: string | null;
  last_checked_at: string | null;
  created_at: string;
};

export type OrderRow = {
  id: string;
  catalog_id: string;
  reference: string;
  shop_name: string;
  phone: string;
  location: string;
  maps_link: string | null;
  notes: string | null;
  subtotal: number;
  status: OrderStatus;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  code: string;
  category: string;
  name: string;
  price: number;
  qty: number;
  line_total: number;
};

export type CatalogViewRow = {
  id: number;
  catalog_id: string;
  created_at: string;
};
