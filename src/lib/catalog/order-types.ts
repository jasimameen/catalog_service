import type { OrderFulfillment, SelectedOption } from "@/lib/supabase/types";

export interface OrderItemPayload {
  code: string;
  qty: number;
  options?: SelectedOption[];
  notes?: string;
}

export interface OrderPayload {
  catalogId: string;
  shopName: string;
  phone: string;
  location: string;
  mapsLink?: string;
  notes?: string;
  fulfillment?: OrderFulfillment | null;
  tableNo?: string;
  geoLat?: number | null;
  geoLng?: number | null;
  formValues?: Record<string, string>;
  items: OrderItemPayload[];
}

export interface OrderResult {
  reference: string;
  total: number;
  itemCount: number;
  lineCount: number;
  shopName: string;
  phone: string;
}
