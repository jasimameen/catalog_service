import { HARBOR_DEMO_NAME } from "@/lib/catalog/demo-harbor";

/** Sample tickets for marketing ops mocks. Harbor dishes, Flutter ops chrome. */
export type OpsFulfillment = "dine_in" | "pickup" | "delivery";
export type OpsStatus = "new" | "preparing" | "ready" | "done";

export type OpsTicket = {
  id: string;
  status: OpsStatus;
  type: OpsFulfillment;
  reference: string;
  when: string;
  itemCount: number;
  summary: string;
  action: string;
  note?: string;
  duplicate?: boolean;
};

export type OpsMenuRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  available: boolean;
};

export const OPS_STORE = HARBOR_DEMO_NAME;

export const OPS_TICKETS: OpsTicket[] = [
  {
    id: "o-4471",
    status: "new",
    type: "dine_in",
    reference: "Table 5",
    when: "Just now",
    itemCount: 3,
    summary: "1× Grilled catch · 1× Harbor salad · 1× House lemonade",
    action: "Accept & start",
    note: "Extra lemon on the catch.",
    duplicate: true,
  },
  {
    id: "o-4472",
    status: "new",
    type: "pickup",
    reference: "Amira K.",
    when: "1m",
    itemCount: 2,
    summary: "1× Lunch plate · 1× Espresso",
    action: "Accept & start",
  },
  {
    id: "o-4460",
    status: "preparing",
    type: "dine_in",
    reference: "Table 2",
    when: "6m",
    itemCount: 3,
    summary: "1× Roast chicken · 1× Herb fries · 1× Seasonal greens",
    action: "Ready",
  },
  {
    id: "o-4468",
    status: "ready",
    type: "delivery",
    reference: "Green Leaf",
    when: "24m",
    itemCount: 3,
    summary: "2× Harbor salad · 1× Olive focaccia · 1× House lemonade",
    action: "Out for delivery",
  },
  {
    id: "o-4465",
    status: "ready",
    type: "pickup",
    reference: "Daniel R.",
    when: "4m",
    itemCount: 1,
    summary: "1× Harbor chowder",
    action: "Done",
  },
  {
    id: "o-4450",
    status: "done",
    type: "dine_in",
    reference: "Table 1",
    when: "22m",
    itemCount: 2,
    summary: "1× Harbor salad · 1× Espresso",
    action: "Done",
  },
];

export const OPS_MENU: OpsMenuRow[] = [
  { id: "m1", name: "Grilled catch", code: "CATCH", category: "Mains", available: true },
  { id: "m2", name: "Harbor salad", code: "SALAD", category: "Mains", available: true },
  { id: "m3", name: "Harbor chowder", code: "CHOWDER", category: "Mains", available: false },
  { id: "m4", name: "Roast chicken", code: "CHICKEN", category: "Mains", available: true },
  { id: "m5", name: "Herb fries", code: "FRIES", category: "Sides", available: true },
  { id: "m6", name: "Olive focaccia", code: "BREAD", category: "Bakery", available: false },
  { id: "m7", name: "House lemonade", code: "LEMONADE", category: "Drinks", available: true },
  { id: "m8", name: "Espresso", code: "ESPRESSO", category: "Drinks", available: true },
];

export const OPS_TABLE_REQUEST = { table: "Table 4", kind: "Waiter" as const };

export function ticketsFor(status: OpsStatus): OpsTicket[] {
  return OPS_TICKETS.filter((row) => row.status === status);
}

export function fulfillmentLabel(type: OpsFulfillment): string {
  if (type === "dine_in") return "Dine-in";
  if (type === "pickup") return "Pickup";
  return "Delivery";
}
