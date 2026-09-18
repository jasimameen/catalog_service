import type { OrderFulfillment, OrderRow } from "@/lib/supabase/types";

export type FulfillmentKind = OrderFulfillment | "catalog";

export function fulfillmentKind(order: Pick<OrderRow, "fulfillment">): FulfillmentKind {
  return order.fulfillment ?? "catalog";
}

export function fulfillmentTypeLabel(order: Pick<OrderRow, "fulfillment" | "table_no" | "location">): string {
  if (order.fulfillment === "dine_in") {
    return order.table_no ? `Table ${order.table_no}` : "Dine in";
  }
  if (order.fulfillment === "pickup") return "Pickup";
  if (order.fulfillment === "delivery") {
    const cue = (order.location ?? "").replace(/\s+/g, " ").trim();
    if (cue) {
      const short = cue.length > 22 ? `${cue.slice(0, 20)}…` : cue;
      return `Delivery · ${short}`;
    }
    return "Delivery";
  }
  return "Order";
}

const TONE: Record<FulfillmentKind, { bg: string; color: string; border: string }> = {
  dine_in: { bg: "var(--cat-ink)", color: "#fff", border: "var(--cat-ink)" },
  pickup: { bg: "var(--cat-accent)", color: "#fff", border: "var(--cat-accent)" },
  delivery: { bg: "var(--cat-photo-bg)", color: "var(--cat-ink)", border: "var(--cat-border)" },
  catalog: { bg: "#fff", color: "var(--cat-muted)", border: "var(--cat-border)" },
};

function TypeMark({ kind }: { kind: FulfillmentKind }) {
  if (kind === "dine_in") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <rect x="1.2" y="3.2" width="7.6" height="5.2" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2.4 3.2V2.3a2.6 2.6 0 0 1 5.2 0v.9" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === "pickup") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d="M2 7.4 5 2.4 8 7.4H2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "delivery") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d="M1.4 6.6h5.2V3.2H1.4v3.4Z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.6 5h1.5L9 6.2v1.2H6.6" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="3.1" cy="7.8" r=".7" fill="currentColor" />
        <circle cx="7.6" cy="7.8" r=".7" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <rect x="1.6" y="1.8" width="6.8" height="6.4" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function FulfillmentTypeBadge({
  order,
  compact = false,
}: {
  order: Pick<OrderRow, "fulfillment" | "table_no" | "location">;
  compact?: boolean;
}) {
  const kind = fulfillmentKind(order);
  const tone = TONE[kind];
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border font-semibold ${
        compact ? "h-5 max-w-[9.5rem] px-1.5 text-[10px]" : "h-6 max-w-[12rem] px-2 text-[11px]"
      }`}
      style={{ background: tone.bg, color: tone.color, borderColor: tone.border }}
      title={fulfillmentTypeLabel(order)}
    >
      <TypeMark kind={kind} />
      <span className="truncate">{fulfillmentTypeLabel(order)}</span>
    </span>
  );
}
