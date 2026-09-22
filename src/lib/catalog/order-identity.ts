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

export type TicketKind = OrderIdentity["kind"] | "reservation";
export type TicketIntensity = "strong" | "normal" | "muted";

/**
 * One accent family for tickets: brand blue (in-house / booking),
 * amber (pickup wait), green (outbound), grey when settled.
 * Washes stay tinted — never neon walls.
 */
export const TYPE_TONE: Record<TicketKind, { ink: string; wash: string; washStrong: string; label: string }> = {
  dine_in: { ink: "#0b5fce", wash: "#e8f0fc", washStrong: "#d4e4fa", label: "Dine-in" },
  pickup: { ink: "#8a5a00", wash: "#fff6e4", washStrong: "#ffe8b8", label: "Pickup" },
  delivery: { ink: "#0f7a3a", wash: "#e3f6ea", washStrong: "#c8eed6", label: "Delivery" },
  catalog: { ink: "#5a6472", wash: "#f2f4f7", washStrong: "#e6eaf0", label: "Order" },
  reservation: { ink: "#0b5fce", wash: "#e8f0fc", washStrong: "#d4e4fa", label: "Booking" },
};

const MUTED_SURFACE = { ink: "#5a6472", wash: "#eef0f4" };

export function ticketSurface(
  kind: TicketKind,
  intensity: TicketIntensity = "normal",
): { ink: string; wash: string; label: string } {
  if (intensity === "muted") return { ...MUTED_SURFACE, label: TYPE_TONE[kind].label };
  const tone = TYPE_TONE[kind];
  return {
    ink: tone.ink,
    wash: intensity === "strong" ? tone.washStrong : tone.wash,
    label: tone.label,
  };
}

export function orderTicketIntensity(lane: WorkflowLaneId): TicketIntensity {
  if (lane === "new") return "strong";
  if (lane === "done") return "muted";
  return "normal";
}
