import "server-only";
import {
  nextWorkflowAction,
  parseOrderStatuses,
  statusById,
  workflowLane,
  type OrderStatusDef,
} from "@/lib/catalog/order-statuses";
import type { CatalogRow, OrderItemRow, OrderRow, SelectedOption } from "@/lib/supabase/types";

function parseSelectedOptions(value: unknown): SelectedOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is SelectedOption =>
      Boolean(row) && typeof row === "object" && typeof (row as SelectedOption).group === "string",
  );
}

function parseComboLines(value: unknown): { name: string; qty: number }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => Boolean(row) && typeof row === "object" && typeof (row as { name?: unknown }).name === "string")
    .map((row) => {
      const line = row as { name: string; qty?: number };
      return { name: line.name, qty: line.qty ?? 1 };
    });
}

/** "Large, Oat milk" from a line item's selected option groups. */
function describeOptions(options: SelectedOption[]): string | null {
  if (options.length === 0) return null;
  return options
    .flatMap((group) => group.values.map((value) => value.name))
    .filter(Boolean)
    .join(", ");
}

export type ShapedOrder = {
  id: string;
  reference: string;
  shop_name: string;
  phone: string;
  location: string;
  maps_link: string | null;
  notes: string | null;
  fulfillment: string | null;
  table_no: string | null;
  status: string;
  status_label: string;
  lane: "new" | "kitchen" | "ready" | "done";
  is_done: boolean;
  next_action: { status: string; label: string } | null;
  claimed_at: string | null;
  claimed_by: string | null;
  created_at: string;
  item_count: number;
  item_summary: string;
  items: {
    id: string;
    name: string;
    qty: number;
    notes: string | null;
    /** "Large, Oat milk" — the chosen variant values, joined for display. */
    variant: string | null;
    combo: { name: string; qty: number }[];
  }[];
};

/** Same shaping the web admin's order board/list derive from order-statuses.ts. */
export function shapeOrder(
  order: OrderRow,
  items: OrderItemRow[],
  statuses: OrderStatusDef[],
): ShapedOrder {
  const def = statusById(statuses, order.status);
  const lane = workflowLane(order.status, statuses);
  const next = def?.is_done ? null : nextWorkflowAction(order.status, statuses);

  const orderItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    notes: item.notes ?? null,
    variant: describeOptions(parseSelectedOptions(item.options_json)),
    combo: parseComboLines(item.combo_json),
  }));

  const itemCount = orderItems.reduce((sum, item) => sum + item.qty, 0);
  const summary = orderItems
    .slice(0, 2)
    .map((item) => (item.qty > 1 ? `${item.qty}× ${item.name}` : item.name))
    .join(", ");
  const itemSummary = orderItems.length > 2 ? `${summary} +${orderItems.length - 2}` : summary;

  return {
    id: order.id,
    reference: order.reference,
    shop_name: order.shop_name,
    phone: order.phone,
    location: order.location,
    maps_link: order.maps_link,
    notes: order.notes,
    fulfillment: order.fulfillment ?? null,
    table_no: order.table_no ?? null,
    status: order.status,
    status_label: def?.label ?? order.status,
    lane,
    is_done: Boolean(def?.is_done),
    next_action: next ? { status: next.nextId, label: next.label } : null,
    claimed_at: order.claimed_at ?? null,
    claimed_by: order.claimed_by ?? null,
    created_at: order.created_at,
    item_count: itemCount,
    item_summary: itemSummary,
    items: orderItems,
  };
}

export function catalogStatuses(catalog: CatalogRow): OrderStatusDef[] {
  return parseOrderStatuses(catalog.order_statuses);
}
