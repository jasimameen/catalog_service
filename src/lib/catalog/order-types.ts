export interface OrderItemPayload {
  code: string;
  qty: number;
}

export interface OrderPayload {
  catalogId: string;
  shopName: string;
  phone: string;
  location: string;
  mapsLink?: string;
  notes?: string;
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
