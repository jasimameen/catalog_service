"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { fulfillmentLabel } from "@/lib/catalog/checkout-form";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { OrderItemRow, OrderRow, SelectedOption } from "@/lib/supabase/types";
import { setOrderStatus } from "./actions";

const COLUMNS: { key: BoardStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Done" },
];

type BoardStatus = "new" | "preparing" | "ready" | "done";

const NEXT: Record<BoardStatus, BoardStatus | null> = {
  new: "preparing",
  preparing: "ready",
  ready: "done",
  done: null,
};

const NEXT_LABEL: Record<BoardStatus, string> = {
  new: "Start preparing",
  preparing: "Mark ready",
  ready: "Mark done",
  done: "Done",
};

function boardStatus(status: string): BoardStatus {
  if (status === "preparing" || status === "ready") return status;
  if (status === "done" || status === "confirmed") return "done";
  return "new";
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export function OrdersBoard({
  catalogId,
  currency,
  initialOrders,
  initialItems,
}: {
  catalogId: string;
  currency: string;
  initialOrders: OrderRow[];
  initialItems: OrderItemRow[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<BoardStatus | "all">("all");
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
    setItems((lineRows ?? []) as OrderItemRow[]);
  }, [catalogId]);

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

  const grouped = useMemo(() => {
    const bags: Record<BoardStatus, OrderRow[]> = { new: [], preparing: [], ready: [], done: [] };
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      bags[boardStatus(order.status)].push(order);
    }
    return bags;
  }, [orders]);

  const visibleColumns = tab === "all" ? COLUMNS : COLUMNS.filter((col) => col.key === tab);

  async function advance(order: OrderRow) {
    const next = NEXT[boardStatus(order.status)];
    if (!next) return;
    setOrders((prev) => prev.map((row) => (row.id === order.id ? { ...row, status: next } : row)));
    await setOrderStatus(catalogId, order.id, next);
  }

  return (
    <div className="flex flex-col gap-4">
      {toast ? (
        <div className="rounded-[12px] bg-[var(--cat-ink)] px-4 py-3 text-[13px] font-medium text-white">
          {toast}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto lg:hidden">
        {([{ key: "all", label: "All" }, ...COLUMNS] as const).map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => setTab(col.key)}
            className={`min-h-11 shrink-0 rounded-full border px-3 text-[13px] font-medium ${
              tab === col.key
                ? "border-[var(--cat-ink)] bg-[var(--cat-ink)] text-white"
                : "border-[#d2d2d7] bg-white text-[var(--cat-ink)]"
            }`}
          >
            {col.label}
            {col.key !== "all" ? ` ${grouped[col.key].length}` : ""}
          </button>
        ))}
      </div>

      <div className={`grid gap-3 ${tab === "all" ? "lg:grid-cols-4" : ""}`}>
        {visibleColumns.map((col) => (
          <section key={col.key} className="rounded-2xl border border-[var(--cat-border)] bg-[#fbfbfd] p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="m-0 text-[13px] font-semibold text-[var(--cat-ink)]">{col.label}</h3>
              <span className="text-xs text-[#86868b]">{grouped[col.key].length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {grouped[col.key].length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-[#86868b]">None</p>
              ) : (
                grouped[col.key].map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    lines={itemsByOrder.get(order.id) ?? []}
                    currency={currency}
                    onAdvance={() => advance(order)}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  lines,
  currency,
  onAdvance,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  onAdvance: () => void;
}) {
  const column = boardStatus(order.status);
  const next = NEXT[column];
  const maps =
    order.maps_link ||
    (order.geo_lat != null && order.geo_lng != null
      ? `https://maps.google.com/?q=${order.geo_lat},${order.geo_lng}`
      : "");

  return (
    <article className="rounded-[14px] border border-[#e8e8ed] bg-white p-3.5 shadow-[0_8px_24px_-20px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[14px] font-semibold text-[var(--cat-ink)]">{order.reference}</p>
          <p className="m-0 mt-0.5 text-xs text-[#86868b]">{formatWhen(order.created_at)}</p>
        </div>
        <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[11px] font-medium text-[var(--cat-ink)]">
          {fulfillmentLabel(order.fulfillment) || "Order"}
        </span>
      </div>
      <p className="m-0 mt-2 text-[13px] font-medium text-[var(--cat-ink)]">
        {order.shop_name || "Guest"}
        {order.phone ? ` · ${order.phone}` : ""}
      </p>
      {order.table_no ? (
        <p className="m-0 mt-1 text-[13px] text-[var(--cat-ink)]">Table {order.table_no}</p>
      ) : null}
      {order.location ? (
        <p className="m-0 mt-1 text-[13px] text-[var(--cat-muted)]">{order.location}</p>
      ) : null}
      {maps ? (
        <a href={maps} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[var(--cat-accent)]">
          Open map
        </a>
      ) : null}

      <ul className="mt-3 flex flex-col gap-1.5 border-t border-[#f0f0f4] pt-2">
        {lines.map((line) => {
          const extras = formatSelectedOptions(
            Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : [],
          );
          return (
            <li key={line.id} className="text-[13px] text-[var(--cat-ink)]">
              <span className="font-medium">
                {line.qty}× {line.name}
              </span>
              {extras ? <span className="block text-xs text-[#86868b]">{extras}</span> : null}
              {line.notes ? <span className="block text-xs text-[#86868b]">{line.notes}</span> : null}
            </li>
          );
        })}
      </ul>

      {order.notes ? (
        <p className="m-0 mt-2 text-xs text-[var(--cat-muted)]">{order.notes}</p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[var(--cat-ink)]">
          {formatMoney(Number(order.subtotal), currency)}
        </span>
        <div className="flex gap-2">
          {order.phone ? (
            <a
              href={`tel:${order.phone}`}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-[#d2d2d7] px-3 text-[13px] font-medium text-[var(--cat-ink)]"
            >
              Call
            </a>
          ) : null}
          {next ? (
            <button
              type="button"
              onClick={onAdvance}
              className="min-h-11 rounded-[10px] bg-[var(--cat-ink)] px-3 text-[13px] font-medium text-white"
            >
              {NEXT_LABEL[column]}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
