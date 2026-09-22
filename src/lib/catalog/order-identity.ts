import type { OrderRow } from "@/lib/supabase/types";
import type { WorkflowLaneId } from "@/lib/catalog/order-statuses";

export type OrderIdentity = {
  title: string;
  meta: string;
  kind: "dine_in" | "pickup" | "delivery" | "catalog";
};

/** Table number / guest name is the hero. Type is a quiet cue, not a chip. */
export function orderIdentity(
  order: Pick<OrderRow, "fulfillment" | "table_no" | "location"> & { shop_name?: string | null },
): OrderIdentity {
  if (order.fulfillment === "dine_in") {
    return {
      title: order.table_no ? `Table ${order.table_no}` : "Dine in",
      meta: order.shop_name || "Guest",
      kind: "dine_in",
    };
  }
  if (order.fulfillment === "pickup") {
    return {
      title: order.shop_name || "Guest",
      meta: "Pickup",
      kind: "pickup",
    };
  }
  if (order.fulfillment === "delivery") {
    return {
      title: order.shop_name || "Guest",
      meta: "Delivery",
      kind: "delivery",
    };
  }
  return {
    title: order.shop_name || "Guest",
    meta: "Order",
    kind: "catalog",
  };
}

/** Three semantic tones + grey. Kitchen = warning (needs a cook). */
export const LANE_TONE: Record<WorkflowLaneId, { ink: string; wash: string }> = {
  new: { ink: "#0b5fce", wash: "#eef4fd" },
  kitchen: { ink: "#8a5a00", wash: "#fff3d6" },
  ready: { ink: "#1e9e4a", wash: "#dff5e6" },
  done: { ink: "#86868b", wash: "#f4f6f9" },
};
