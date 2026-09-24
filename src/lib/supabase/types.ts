// Hand-written row types matching supabase/schema.sql.
// Regenerate/replace with `supabase gen types typescript` once the project is live, if desired.
//
// These are `type` aliases, not `interface`s, deliberately: `Partial<T>` over
// an `interface` breaks postgrest-js's generic Insert/Update inference (every
// `.insert()`/`.update()` call silently types its argument as `never`, with
// no error at the Database type declaration itself — only at every call
// site). Verified against @supabase/supabase-js 2.116.0 + postgrest-js
// 2.116.0. `type` aliases don't have this problem.

export type CatalogTemplate =
  | "grid"
  | "lookbook"
  | "menu"
  | "pricelist"
  | "cards"
  | "compact"
  | "spotlight";
export type CatalogStatus = "draft" | "live";
export type DomainKind = "subdomain" | "custom";
export type DomainStatus = "pending" | "verified" | "error";
export type OrderStatus = string;
export type OrderFulfillment = "dine_in" | "pickup" | "delivery";
export type LsStatus = "trialing" | "active" | "past_due" | "cancelled";
export type CheckoutFieldMode = "required" | "optional" | "hidden";
export type CheckoutFormFieldType = "text" | "tel" | "textarea" | "select" | "number";
export type ItemOptionType = "single" | "multi";
export type ImageFit = "cover" | "contain";

export type CatalogBanner = {
  image: string;
  alt: string;
};

export type ItemOptionValue = {
  name: string;
  price_delta: number;
};

export type ItemOptionGroup = {
  name: string;
  type: ItemOptionType;
  required: boolean;
  values: ItemOptionValue[];
};

export type SelectedOption = {
  group: string;
  values: ItemOptionValue[];
};

export type CheckoutFormField = {
  id: string;
  label: string;
  type: CheckoutFormFieldType;
  required: boolean;
  options?: string[];
  show_when?: OrderFulfillment[];
};

export type CheckoutFields = {
  shopName: CheckoutFieldMode;
  phone: CheckoutFieldMode;
  address: CheckoutFieldMode;
  maps: CheckoutFieldMode;
  notes: CheckoutFieldMode;
  phonePrefix: string;
  orderPrefix: string;
};

export type AccountRow = {
  id: string;
  name: string;
  currency: string;
  order_email: string | null;
  order_email_cc: string | null;
  trial_ends_at: string;
  ls_customer_id: string | null;
  ls_subscription_id: string | null;
  ls_status: LsStatus | null;
  ls_renews_at: string | null;
  /** Operator grant — skip Lemon / in-app trial. Shop stays live. */
  comp?: boolean | null;
  /** Operator override. Null = use plan default (trial 1, paid unlimited). */
  max_catalogs?: number | null;
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
  checkout_fields: CheckoutFields;
  checkout_form?: CheckoutFormField[] | unknown;
  fulfillment_modes?: OrderFulfillment[] | unknown;
  logo: string | null;
  tagline: string | null;
  about: string | null;
  banners?: CatalogBanner[] | unknown;
  image_fit?: ImageFit | string | null;
  phone?: string | null;
  address?: string | null;
  hours?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  accept_orders?: boolean | null;
  kitchen_open?: boolean | null;
  show_map?: boolean | null;
  show_hours?: boolean | null;
  show_contact?: boolean | null;
  show_social?: boolean | null;
  locations?: unknown;
  geo_lat?: number | null;
  geo_lng?: number | null;
  placeholder_image_url?: string | null;
  order_statuses?: unknown;
  default_order_status?: string | null;
  orders_paused_message?: string | null;
  storefront_alert?: string | null;
  show_storefront_alert?: boolean | null;
  template_settings?: unknown;
  created_at: string;
  updated_at: string;
  transferred_at?: string | null;
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
  options?: ItemOptionGroup[] | unknown;
  featured?: boolean;
  image_fit?: ImageFit | string | null;
  is_combo?: boolean;
  combo_lines?: { item_id: string; qty: number }[] | unknown;
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
  fulfillment?: OrderFulfillment | null;
  table_no?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  form_values?: Record<string, string> | unknown;
  track_token?: string | null;
  claimed_at?: string | null;
  claimed_by?: string | null;
  created_at: string;
};

export type ReservationItemSnap = {
  code: string;
  name: string;
  qty: number;
  price: number;
  options?: SelectedOption[];
  notes?: string;
};

export type ReservationStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

export type ReservationTableRef = {
  id: string;
  no: string;
};

export type ReservationRow = {
  id: string;
  catalog_id: string;
  table_id: string | null;
  table_no: string | null;
  table_ids?: ReservationTableRef[] | unknown;
  day: string;
  slot: string;
  guests: number;
  name: string;
  phone: string;
  note: string | null;
  items?: ReservationItemSnap[] | unknown;
  order_id?: string | null;
  status?: ReservationStatus | string | null;
  confirmed_at?: string | null;
  seated_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  no_show_at?: string | null;
  track_token?: string | null;
  created_at: string;
};

export type ReservationStatusEventRow = {
  id: string;
  reservation_id: string;
  from_status: string | null;
  to_status: string;
  actor: string | null;
  created_at: string;
};

export type ServiceRequestRow = {
  id: string;
  catalog_id: string;
  table_no: string | null;
  kind: string;
  note: string | null;
  created_at: string;
  resolved_at?: string | null;
};

export type MobilePushTokenRow = {
  id: string;
  account_id: string;
  token: string;
  platform: "ios" | "android" | "web";
  created_at: string;
  updated_at: string;
};

export type OrderStatusEventRow = {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  actor: string | null;
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
  options_json?: SelectedOption[] | unknown;
  notes?: string | null;
  combo_json?: { item_id?: string; code?: string; name: string; qty: number }[] | unknown;
};

export type CatalogViewRow = {
  id: number;
  catalog_id: string;
  created_at: string;
};

export type SetupInquiryStatus = "new" | "in_progress" | "live" | "closed";
export type SetupBusinessType = "restaurant" | "retail" | "other";
export type SetupInquiryFileKind = "menu" | "logo" | "photo";

export type SetupInquiryFile = {
  path: string;
  name: string;
  kind: SetupInquiryFileKind;
  size: number;
  type: string;
};

export type SetupInquiryDayHours = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  closed: boolean;
  open: string;
  close: string;
};

export type SetupInquiryHours = {
  days: SetupInquiryDayHours[];
  notes: string;
};

export type EmailOtpChallengeRow = {
  email: string;
  code_hash: string;
  expires_at: string;
  sent_at: string;
  attempts: number;
};

export type SetupInquiryRow = {
  id: string;
  business_name: string;
  business_type: SetupBusinessType;
  city: string;
  country: string;
  contact_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  website: string;
  tiktok: string;
  hours: SetupInquiryHours | unknown;
  notes: string;
  files: SetupInquiryFile[] | unknown;
  status: SetupInquiryStatus;
  created_at: string;
  updated_at: string;
};
