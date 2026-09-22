import type { OrderFulfillment, OrderRow } from "@/lib/supabase/types";
import { orderIdentity } from "@/lib/catalog/order-identity";

export type FulfillmentKind = OrderFulfillment | "catalog";
export type OpsMarkKind = FulfillmentKind | "reservation" | "done" | "orders";

export function fulfillmentKind(order: Pick<OrderRow, "fulfillment">): FulfillmentKind {
  return order.fulfillment ?? "catalog";
}

export function fulfillmentTypeLabel(order: Pick<OrderRow, "fulfillment" | "table_no" | "location">): string {
  const id = orderIdentity(order);
  if (id.kind === "dine_in") return id.title;
  return id.meta;
}

/** Teaching marks: table, bag, bike, clock, check. Inherit currentColor. */
export function TypeMark({
  kind,
  size = 15,
}: {
  kind: OpsMarkKind;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": true as const,
  };
  if (kind === "dine_in") {
    return (
      <svg {...common}>
        <path d="M3 7.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8 7.5V13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5 13h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="4.6" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (kind === "pickup") {
    return (
      <svg {...common}>
        <path
          d="M4.2 6.2h7.6l-.5 6.2a1.2 1.2 0 0 1-1.2 1.1H5.9a1.2 1.2 0 0 1-1.2-1.1L4.2 6.2Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M6 6.1V5a2 2 0 0 1 4 0v1.1"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "delivery") {
    return (
      <svg {...common}>
        <path d="M2.2 10.4h6.2V6.1H2.2v4.3Z" stroke="currentColor" strokeWidth="1.35" />
        <path d="M8.4 8.3h2.1l1.6 1.6v1.5H8.4" stroke="currentColor" strokeWidth="1.35" />
        <circle cx="4.4" cy="12.2" r="1.05" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="11.3" cy="12.2" r="1.05" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === "reservation") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5.2v3.2l2.2 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "done") {
    return (
      <svg {...common}>
        <path
          d="M3.4 8.2 6.5 11.2 12.6 4.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3.2" y="2.8" width="9.6" height="10.4" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.4 6h5.2M5.4 8.6h5.2M5.4 11.1h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** Quiet type cue — icon + words, never a filled black pill. */
export function FulfillmentTypeBadge({
  order,
  compact = false,
}: {
  order: Pick<OrderRow, "fulfillment" | "table_no" | "location">;
  compact?: boolean;
}) {
  const kind = fulfillmentKind(order);
  const label = fulfillmentTypeLabel(order);
  const accent = kind === "dine_in";
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center gap-1 ${
        accent ? "text-[var(--cat-accent)]" : "text-[#86868b]"
      } ${compact ? "text-[11px]" : "text-[12px]"}`}
      title={label}
    >
      <TypeMark kind={kind} size={compact ? 13 : 15} />
      <span className="truncate">{label}</span>
    </span>
  );
}
