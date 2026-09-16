"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/catalog/currency";
import { fulfillmentLabel } from "@/lib/catalog/checkout-form";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import {
  findDuplicateRefs,
  formatOrderDateTime,
  ORDER_FILTER_INCLUDE_EVENT,
  statusLabel,
  type OrderFilterIncludeDetail,
  type OrderStatusDef,
} from "@/lib/catalog/order-statuses";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { OrderItemRow, OrderRow, SelectedOption } from "@/lib/supabase/types";
import { StatusTimeline } from "@/components/orders/StatusTimeline";
import type { OrderStatusEventRow } from "@/lib/supabase/types";
import { ensureTrackLink, setOrderStatus } from "./actions";

function itemsSummary(lines: OrderItemRow[]): string {
  if (lines.length === 0) return "No items";
  const shown = lines.slice(0, 3).map((line) => `${line.qty}× ${line.name}`);
  if (lines.length > 3) shown.push(`+${lines.length - 3} more`);
  return shown.join(", ");
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore autoplay restrictions
  }
}

function notifyNewOrder(order: OrderRow) {
  playBeep();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification("New order", {
        body: `${order.reference} · ${order.shop_name || order.phone || "Guest"}`,
      });
    } catch {
      // ignore
    }
  }
}

function writeFilterUrl(catalogId: string, ids: string[]) {
  const next = `/admin/${catalogId}/orders?status=${encodeURIComponent(ids.join(","))}`;
  window.history.replaceState(null, "", next);
}

export function OrdersBoard({
  catalogId,
  currency,
  showFulfillment,
  statuses,
  initialFilter,
  initialOrders,
  initialItems,
  initialDuplicates,
  initialEvents,
}: {
  catalogId: string;
  currency: string;
  showFulfillment: boolean;
  statuses: OrderStatusDef[];
  initialFilter: string[];
  initialOrders: OrderRow[];
  initialItems: OrderItemRow[];
  initialDuplicates: Record<string, string[]>;
  initialEvents: OrderStatusEventRow[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<string[]>(initialFilter);
  const [extraStatuses, setExtraStatuses] = useState<OrderStatusDef[]>([]);
  const [duplicates, setDuplicates] = useState(initialDuplicates);
  const [events, setEvents] = useState(initialEvents);
  const [toast, setToast] = useState<string | null>(null);
  const seenIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const hydrated = useRef(false);

  const itemsByOrder = useMemo(() => {
    const map = new Map<string, OrderItemRow[]>();
    for (const line of items) {
      const list = map.get(line.order_id) ?? [];
      list.push(line);
      map.set(line.order_id, list);
    }
    return map;
  }, [items]);

  const refresh = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data: orderRows } = await supabase
      .from("orders")
      .select("*")
      .eq("catalog_id", catalogId)
      .order("created_at", { ascending: false });
    const nextOrders = (orderRows ?? []) as OrderRow[];
    const ids = nextOrders.map((o) => o.id);
    const { data: lineRows } =
      ids.length > 0
        ? await supabase.from("order_items").select("*").in("order_id", ids)
        : { data: [] as OrderItemRow[] };
    const nextItems = (lineRows ?? []) as OrderItemRow[];
    const nextByOrder = new Map<string, OrderItemRow[]>();
    for (const line of nextItems) {
      const list = nextByOrder.get(line.order_id) ?? [];
      list.push(line);
      nextByOrder.set(line.order_id, list);
    }

    const newcomers = nextOrders.filter((o) => !seenIds.current.has(o.id));
    if (hydrated.current && newcomers.length > 0) {
      for (const order of newcomers) {
        seenIds.current.add(order.id);
        notifyNewOrder(order);
      }
      setToast(
        newcomers.length === 1
          ? `New order ${newcomers[0]!.reference}`
          : `${newcomers.length} new orders`,
      );
    } else {
      for (const order of nextOrders) seenIds.current.add(order.id);
    }
    hydrated.current = true;
    setOrders(nextOrders);
    setItems(nextItems);
    setDuplicates(Object.fromEntries(findDuplicateRefs(nextOrders, nextByOrder, statuses)));
  }, [catalogId, statuses]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    const interval = window.setInterval(() => {
      void refresh();
    }, 8000);
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`orders:${catalogId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `catalog_id=eq.${catalogId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [catalogId, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onInclude(event: Event) {
      const detail = (event as CustomEvent<OrderFilterIncludeDetail>).detail;
      if (!detail) return;
      const extras = detail.extras ?? [];
      if (extras.length > 0) {
        setExtraStatuses((prev) => {
          const map = new Map(prev.map((row) => [row.id, row]));
          for (const extra of extras) map.set(extra.id, extra);
          return [...map.values()];
        });
      }
      const ids = detail.ids ?? [];
      if (ids.length === 0) return;
      setFilter((prev) => {
        const next = [...prev];
        for (const id of ids) {
          if (!next.includes(id)) next.push(id);
        }
        writeFilterUrl(catalogId, next);
        return next;
      });
    }
    window.addEventListener(ORDER_FILTER_INCLUDE_EVENT, onInclude);
    return () => window.removeEventListener(ORDER_FILTER_INCLUDE_EVENT, onInclude);
  }, [catalogId]);

  const filterStatuses = useMemo(() => {
    const map = new Map(statuses.map((row) => [row.id, row]));
    for (const extra of extraStatuses) {
      if (!map.has(extra.id)) map.set(extra.id, extra);
    }
    return [...map.values()];
  }, [extraStatuses, statuses]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const status of filterStatuses) next[status.id] = 0;
    for (const order of orders) {
      if (next[order.status] == null) next[order.status] = 0;
      next[order.status] += 1;
    }
    return next;
  }, [filterStatuses, orders]);

  const visible = useMemo(() => {
    const allowed = new Set(filter);
    return orders.filter((order) => allowed.has(order.status));
  }, [filter, orders]);

  function toggleStatus(id: string) {
    const next = filter.includes(id) ? filter.filter((item) => item !== id) : [...filter, id];
    setFilter(next);
    writeFilterUrl(catalogId, next);
  }

  function showOpenOnly() {
    const next = filterStatuses.filter((row) => !row.is_done).map((row) => row.id);
    setFilter(next);
    writeFilterUrl(catalogId, next);
  }

  function showAll() {
    const next = filterStatuses.map((row) => row.id);
    setFilter(next);
    writeFilterUrl(catalogId, next);
  }

  async function updateStatus(order: OrderRow, next: string) {
    setOrders((prev) => prev.map((row) => (row.id === order.id ? { ...row, status: next } : row)));
    const result = await setOrderStatus(catalogId, order.id, next);
    if (result.error) {
      setToast(result.error);
      router.refresh();
      return;
    }
    if (result.event) {
      setEvents((prev) => [...prev, result.event!]);
    }
    const map = new Map(orders.map((row) => [row.id, itemsByOrder.get(row.id) ?? []]));
    const nextOrders = orders.map((row) => (row.id === order.id ? { ...row, status: next } : row));
    setDuplicates(Object.fromEntries(findDuplicateRefs(nextOrders, map, statuses)));
  }

  return (
    <div className="flex flex-col gap-4">
      {toast ? (
        <div className="rounded-[12px] bg-[var(--cat-ink)] px-4 py-3 text-[13px] font-medium text-white">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={showOpenOnly}
          className="min-h-11 shrink-0 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[var(--cat-ink)]"
        >
          Open
        </button>
        <button
          type="button"
          onClick={showAll}
          className="min-h-11 shrink-0 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[var(--cat-ink)]"
        >
          All
        </button>
        {filterStatuses.map((status) => {
          const on = filter.includes(status.id);
          return (
            <button
              key={status.id}
              type="button"
              onClick={() => toggleStatus(status.id)}
              className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-3 text-[13px] font-medium ${
                on
                  ? "border-[var(--cat-ink)] bg-[var(--cat-ink)] text-white"
                  : "border-[#d2d2d7] bg-white text-[var(--cat-ink)]"
              }`}
            >
              {status.color ? (
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ background: status.color }}
                />
              ) : null}
              {status.label} {counts[status.id] ?? 0}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-[var(--cat-border)] bg-white px-4 py-10 text-center text-[13px] text-[#86868b]">
          {orders.length === 0 ? "No orders yet." : "No orders match these statuses."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--cat-border)] bg-white">
          <div className="hidden border-b border-[var(--cat-border)] bg-[#fbfbfd] px-[18px] py-3 text-[11px] font-semibold uppercase tracking-wide text-[#86868b] md:grid md:grid-cols-[minmax(140px,1fr)_minmax(160px,1.2fr)_minmax(0,1.6fr)_88px_168px] md:gap-3">
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {visible.map((order) => (
            <OrderRowView
              key={order.id}
              order={order}
              lines={itemsByOrder.get(order.id) ?? []}
              currency={currency}
              showFulfillment={showFulfillment}
              statuses={statuses}
              duplicateRefs={duplicates[order.id] ?? []}
              events={events.filter((event) => event.order_id === order.id)}
              catalogId={catalogId}
              onStatus={(next) => updateStatus(order, next)}
              onCopied={(message) => setToast(message)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRowView({
  order,
  lines,
  currency,
  showFulfillment,
  statuses,
  duplicateRefs,
  events,
  catalogId,
  onStatus,
  onCopied,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  showFulfillment: boolean;
  statuses: OrderStatusDef[];
  duplicateRefs: string[];
  events: OrderStatusEventRow[];
  catalogId: string;
  onStatus: (next: string) => void;
  onCopied: (message: string) => void;
}) {
  const maps =
    order.maps_link ||
    (order.geo_lat != null && order.geo_lng != null
      ? `https://maps.google.com/?q=${order.geo_lat},${order.geo_lng}`
      : "");
  const extras = [
    showFulfillment && order.fulfillment ? fulfillmentLabel(order.fulfillment) : "",
    showFulfillment && order.table_no ? `Table ${order.table_no}` : "",
    order.location,
  ]
    .filter(Boolean)
    .join(" · ");
  const options = statuses.some((row) => row.id === order.status)
    ? statuses
    : [...statuses, { id: order.status, label: statusLabel(statuses, order.status), sort: statuses.length, is_done: false }];
  const current = statusByColor(statuses, order.status);

  return (
    <article className="border-b border-[#f0f0f4] px-4 py-3.5 last:border-b-0 md:grid md:grid-cols-[minmax(140px,1fr)_minmax(160px,1.2fr)_minmax(0,1.6fr)_88px_168px] md:items-start md:gap-3 md:px-[18px]">
      <div className="min-w-0">
        <p className="m-0 text-[14px] font-semibold text-[var(--cat-ink)]">{order.reference}</p>
        <p suppressHydrationWarning className="m-0 mt-0.5 text-xs text-[#86868b]">
          {formatOrderDateTime(order.created_at)}
        </p>
        {duplicateRefs.length > 0 ? (
          <p className="m-0 mt-1 inline-flex rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-medium text-[#9a5b00]">
            Possible duplicate · {duplicateRefs.join(", ")}
          </p>
        ) : null}
      </div>
      <div className="mt-2 min-w-0 md:mt-0">
        <p className="m-0 truncate text-[13px] font-medium text-[var(--cat-ink)]">
          {order.shop_name || "Guest"}
          {order.phone ? ` · ${order.phone}` : ""}
        </p>
        {extras ? <p className="m-0 mt-0.5 truncate text-xs text-[#86868b]">{extras}</p> : null}
        <div className="mt-1 flex flex-wrap gap-x-3">
          {order.phone ? (
            <a href={`tel:${order.phone}`} className="text-xs font-medium text-[var(--cat-accent)]">
              Call
            </a>
          ) : null}
          {maps ? (
            <a href={maps} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--cat-accent)]">
              Map
            </a>
          ) : null}
          <HistoryAndTrack
            catalogId={catalogId}
            orderId={order.id}
            events={events}
            statuses={statuses}
            onCopied={onCopied}
          />
        </div>
      </div>
      <div className="mt-2 min-w-0 md:mt-0">
        <p className="m-0 text-[13px] text-[var(--cat-ink)]" title={itemsSummary(lines)}>
          {itemsSummary(lines)}
        </p>
        {lines.some((line) => line.notes || (Array.isArray(line.options_json) && line.options_json.length > 0))
          ? lines.slice(0, 2).map((line) => {
              const optionText = formatSelectedOptions(
                Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : [],
              );
              if (!optionText && !line.notes) return null;
              return (
                <p key={line.id} className="m-0 mt-0.5 truncate text-xs text-[#86868b]">
                  {optionText || line.notes}
                </p>
              );
            })
          : null}
        {order.notes ? <p className="m-0 mt-1 text-xs text-[var(--cat-muted)]">{order.notes}</p> : null}
      </div>
      <p className="mt-2 text-[13px] font-semibold text-[var(--cat-ink)] md:mt-0">
        {formatMoney(Number(order.subtotal), currency)}
      </p>
      <div className="mt-3 md:mt-0">
        <label className="sr-only" htmlFor={`order-status-${order.id}`}>
          Status for {order.reference}
        </label>
        <select
          id={`order-status-${order.id}`}
          value={order.status}
          onChange={(event) => onStatus(event.target.value)}
          className="min-h-11 w-full cursor-pointer rounded-[10px] border border-[#d2d2d7] bg-white px-2.5 text-[13px] font-medium text-[var(--cat-ink)]"
          style={current ? { borderColor: current } : undefined}
        >
          {options.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function statusByColor(statuses: OrderStatusDef[], id: string): string | undefined {
  return statuses.find((row) => row.id === id)?.color;
}

function HistoryAndTrack({
  catalogId,
  orderId,
  events,
  statuses,
  onCopied,
}: {
  catalogId: string;
  orderId: string;
  events: OrderStatusEventRow[];
  statuses: OrderStatusDef[];
  onCopied: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);

  async function copyLink() {
    const result = await ensureTrackLink(catalogId, orderId);
    if (result.error || !result.url) {
      onCopied(result.error || "Could not copy tracking link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(result.url);
      onCopied("Tracking link copied.");
    } catch {
      onCopied(result.url);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-xs font-medium text-[var(--cat-accent)]"
      >
        {open ? "Hide history" : "History"}
      </button>
      <button type="button" onClick={() => void copyLink()} className="text-xs font-medium text-[var(--cat-accent)]">
        Copy tracking link
      </button>
      {open ? (
        <div className="mt-2 w-full basis-full">
          <StatusTimeline events={events} statuses={statuses} />
        </div>
      ) : null}
    </>
  );
}
