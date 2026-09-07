export interface OrderItem {
  code: string;
  category: string;
  price: number;
  qty: number;
}

export interface OrderPayload {
  shopName: string;
  phone: string;
  location: string;
  notes?: string;
  items: OrderItem[];
}
