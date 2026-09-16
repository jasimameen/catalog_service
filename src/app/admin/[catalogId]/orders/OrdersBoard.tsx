"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/catalog/currency";
import { fulfillmentLabel } from "@/lib/catalog/checkout-form";
import type { ItemThumb } from "@/lib/catalog/combos";
import {
  findDuplicateRefs,
  formatOrderDateTime,
  ORDER_FILTER_INCLUDE_EVENT,
  statusLabel,
  type OrderFilterIncludeDetail,
  type OrderStatusDef,
} from "@/lib/catalog/order-statuses";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { CheckoutFormField, OrderItemRow, OrderRow } from "@/lib/supabase/types";
import type { OrderStatusEventRow } from "@/lib/supabase/types";
import { setOrderStatus } from "./actions";
import { OrderDetailDrawer } from "./OrderDetailDrawer";

type ViewMode = "table" | "board";

type DragState = {
  orderId: string;
  fromStatus: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  active: boolean;
};

const DRAG_THRESHOLD = 8;

function itemsSummary(lines: OrderItemRow[]): string {
  if (lines.length === 0) return "No items";
  const shown = lines.slice(0, 3).map((line) => `${line.qty}× ${line.name}`);
  if (lines.length > 3) shown.push(`+${lines.length - 3} more`);
  return shown.join(" · ");
}

function itemLines(lines: OrderItemRow[]): string[] {
  if (lines.length === 0) return ["No items"];
  const shown = lines.slice(0, 3).map((line) => `${line.qty}× ${line.name}`);
  if (lines.length > 3) shown.push(`+${lines.length - 3} more`);
  return shown;
}

function statusTint(hex?: string) {
  return hex ? `${hex}1a` : "#fbfbfd";
}

function statusEdge(hex?: string) {
  return hex ? `${hex}40` : "#e2e7ee";
}

function statusTintStrong(hex?: string) {
  return hex ? `${hex}26` : "#f4f6f9";
}

function columnAtPoint(x: number, y: number): string | null {
  const node = document.elementFromPoint(x, y);
  if (!(node instanceof Element)) return null;
  const col = node.closest("[data-board-col]");
  return col instanceof HTMLElement ? col.dataset.boardCol ?? null : null;
}

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((id) => set.has(id));
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
  thumbs,
  checkoutForm,
  children,
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
  thumbs: ItemThumb[];
  checkoutForm: CheckoutFormField[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<string[]>(initialFilter);
  const [extraStatuses, setExtraStatuses] = useState<OrderStatusDef[]>([]);
  const [duplicates, setDuplicates] = useState(initialDuplicates);
  const [events, setEvents] = useState(initialEvents);
  const [toast, setToast] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const seenIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const hydrated = useRef(false);
  const dragRef = useRef<DragState | null>(null);

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
    const { data: eventRows } =
      ids.length > 0
        ? await supabase
            .from("order_status_events")
            .select("*")
            .in("order_id", ids)
            .order("created_at", { ascending: true })
        : { data: [] as OrderStatusEventRow[] };
    const nextItems = (lineRows ?? []) as OrderItemRow[];
    const nextEvents = (eventRows ?? []) as OrderStatusEventRow[];
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
    setEvents(nextEvents);
    setDuplicates(Object.fromEntries(findDuplicateRefs(nextOrders, nextByOrder, statuses)));
  }, [catalogId, statuses]);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotifyPermission("unsupported");
    } else {
      setNotifyPermission(Notification.permission);
    }
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`orders:${catalogId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `catalog_id=eq.${catalogId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();
    const interval = window.setInterval(() => {
      void refresh();
    }, 10000);
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [catalogId, refresh]);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(`catalog-orders-view:${catalogId}`);
      if (stored === "board" || stored === "table") setView(stored);
    } catch {
      // ignore
    }
  }, [catalogId]);

  async function enableNotify() {
    if (typeof Notification === "undefined") return;
    const next = await Notification.requestPermission();
    setNotifyPermission(next);
  }

  function pickView(next: ViewMode) {
    setView(next);
    try {
      window.sessionStorage.setItem(`catalog-orders-view:${catalogId}`, next);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!drag?.active) return;
    const prevSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.userSelect = prevSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [drag?.active]);

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

  const openIds = useMemo(
    () => filterStatuses.filter((row) => !row.is_done).map((row) => row.id),
    [filterStatuses],
  );
  const allIds = useMemo(() => filterStatuses.map((row) => row.id), [filterStatuses]);
  const isOpenFilter = sameIds(filter, openIds);
  const isAllFilter = !isOpenFilter && sameIds(filter, allIds);

  const openOrder = openId ? orders.find((order) => order.id === openId) ?? null : null;

  function toggleStatus(id: string) {
    const next = filter.includes(id) ? filter.filter((item) => item !== id) : [...filter, id];
    if (next.length === 0) return;
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
    if (order.status === next) return;
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

  function beginCardDrag(order: OrderRow, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("select, option, a, button, input, label")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next: DragState = {
      orderId: order.id,
      fromStatus: order.status,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      active: false,
    };
    dragRef.current = next;
    setDrag(next);
    setOverCol(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCardDrag(event: PointerEvent<HTMLElement>) {
    const cur = dragRef.current;
    if (!cur) return;
    const dist = Math.hypot(event.clientX - cur.startX, event.clientY - cur.startY);
    const active = cur.active || dist >= DRAG_THRESHOLD;
    if (active) event.preventDefault();
    const next: DragState = { ...cur, x: event.clientX, y: event.clientY, active };
    dragRef.current = next;
    setDrag(next);
    setOverCol(active ? columnAtPoint(event.clientX, event.clientY) : null);
  }

  function endCardDrag(order: OrderRow, event: PointerEvent<HTMLElement>, cancelled = false) {
    const cur = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    setOverCol(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!cur) return;
    if (cancelled) return;
    if (!cur.active) {
      setOpenId(order.id);
      return;
    }
    const col = columnAtPoint(event.clientX, event.clientY);
    if (col && col !== order.status) {
      void updateStatus(order, col);
    }
  }

  const emptyCopy = visible.length === 0 ? (orders.length === 0 ? "No orders yet." : "No orders match these statuses.") : "";
  const boardColumns = filterStatuses.filter((status) => filter.includes(status.id));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="m-0 min-w-0 flex-1 basis-60 text-[13px] text-[#5a6472]">
          Mark each order status as it moves along.
        </p>
        <div className="flex gap-1 rounded-[11px] border border-[#e2e7ee] bg-white p-[3px]">
          <button
            type="button"
            onClick={() => pickView("table")}
            className="min-h-[38px] cursor-pointer rounded-lg px-3.5 text-[13px]"
            style={{
              background: view === "table" ? "#101720" : "transparent",
              color: view === "table" ? "#fff" : "#5a6472",
            }}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => pickView("board")}
            className="min-h-[38px] cursor-pointer rounded-lg px-3.5 text-[13px]"
            style={{
              background: view === "board" ? "#101720" : "transparent",
              color: view === "board" ? "#fff" : "#5a6472",
            }}
          >
            Board
          </button>
        </div>
        {notifyPermission === "default" ? (
          <button
            type="button"
            onClick={() => void enableNotify()}
            className="min-h-[38px] shrink-0 cursor-pointer rounded-full border border-[#e2e7ee] bg-white px-3.5 text-[13px] hover:border-[#c3ccd9]"
          >
            Notify me
          </button>
        ) : null}
        <a
          href={`/admin/${catalogId}/orders/export`}
          className="inline-flex min-h-[38px] shrink-0 items-center rounded-full border border-[#e2e7ee] bg-white px-3.5 text-[13px] text-[var(--cat-ink)] hover:border-[#c3ccd9]"
        >
          Export CSV
        </a>
      </div>

      {children}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
        <FilterPill label="Open" selected={isOpenFilter} onClick={showOpenOnly} />
        <FilterPill label="All" selected={isAllFilter} onClick={showAll} />
        {filterStatuses.map((status) => {
          const on = !isOpenFilter && !isAllFilter && filter.includes(status.id);
          return (
            <FilterPill
              key={status.id}
              label={`${status.label} ${counts[status.id] ?? 0}`}
              selected={on}
              dot={status.color}
              onClick={() => toggleStatus(status.id)}
            />
          );
        })}
      </div>

      {view === "board" ? (
        <div className="-mx-1 flex items-start gap-3 overflow-x-auto px-1 pb-1.5 [scrollbar-width:thin]">
          {boardColumns.map((status) => {
            const cards = visible.filter((order) => order.status === status.id);
            const dropping = overCol === status.id && drag?.active === true && drag.fromStatus !== status.id;
            return (
              <section
                key={status.id}
                data-board-col={status.id}
                className="max-w-[360px] min-w-[264px] flex-1 overflow-hidden rounded-[14px] border bg-white transition-[box-shadow,border-color,background-color]"
                style={{
                  borderColor: dropping ? status.color || "#0b5fce" : "#e2e7ee",
                  background: dropping ? statusTint(status.color) : "#fff",
                  boxShadow: dropping ? `inset 0 0 0 2px ${status.color || "#0b5fce"}` : undefined,
                }}
              >
                <div
                  className="flex items-center gap-2.5 border-b px-3.5 py-3"
                  style={{
                    background: statusTint(status.color),
                    borderColor: statusEdge(status.color),
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: status.color || "#86868b" }}
                  />
                  <span className="min-w-0 flex-1 text-[14px] font-semibold tracking-tight">
                    {status.label}
                  </span>
                  <span className="text-[12px] tabular-nums text-[#46505e]">{cards.length}</span>
                </div>
                <div className="flex min-h-[88px] flex-col gap-2.5 p-2.5">
                  {cards.map((order) => (
                    <BoardCard
                      key={order.id}
                      order={order}
                      lines={itemsByOrder.get(order.id) ?? []}
                      currency={currency}
                      showFulfillment={showFulfillment}
                      statuses={statuses}
                      duplicateRefs={duplicates[order.id] ?? []}
                      dragging={drag?.orderId === order.id && drag.active}
                      onPointerDown={(event) => beginCardDrag(order, event)}
                      onPointerMove={moveCardDrag}
                      onPointerUp={(event) => endCardDrag(order, event)}
                      onPointerCancel={(event) => endCardDrag(order, event, true)}
                      onOpen={() => setOpenId(order.id)}
                      onStatus={(next) => updateStatus(order, next)}
                    />
                  ))}
                  {cards.length === 0 ? (
                    <div className="px-2 py-[22px] text-center text-[12px] text-[#a3abb8]">
                      {dropping ? "Drop to move here" : "Nothing here"}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {drag?.active ? (
        <DragGhost
          order={orders.find((row) => row.id === drag.orderId) ?? null}
          statuses={statuses}
          currency={currency}
          drag={drag}
        />
      ) : null}

      {view === "table" ? (
        <>
          <section className="hidden overflow-hidden rounded-[14px] border border-[#e2e7ee] bg-white md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="flex gap-3.5 border-b border-[#edf0f4] bg-[#fbfbfd] px-[18px] py-[11px] text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">
                  <div className="min-w-0 flex-[1_1_170px]">Order</div>
                  <div className="min-w-0 flex-[1_1_180px]">Customer</div>
                  <div className="min-w-0 flex-[1_1_220px]">Items</div>
                  <div className="w-[110px] shrink-0 text-right">Total</div>
                  <div className="w-[176px] shrink-0">Status</div>
                </div>
                {visible.map((order) => (
                  <DesktopRow
                    key={order.id}
                    order={order}
                    lines={itemsByOrder.get(order.id) ?? []}
                    currency={currency}
                    showFulfillment={showFulfillment}
                    statuses={statuses}
                    duplicateRefs={duplicates[order.id] ?? []}
                    selected={openId === order.id}
                    onOpen={() => setOpenId(order.id)}
                    onStatus={(next) => updateStatus(order, next)}
                  />
                ))}
              </div>
            </div>
            {emptyCopy ? (
              <div className="px-[18px] py-12 text-center text-[14px] text-[#8a93a2]">{emptyCopy}</div>
            ) : null}
          </section>

          <div className="flex flex-col gap-2.5 md:hidden">
            {visible.map((order) => (
              <MobileCard
                key={order.id}
                order={order}
                lines={itemsByOrder.get(order.id) ?? []}
                currency={currency}
                showFulfillment={showFulfillment}
                statuses={statuses}
                duplicateRefs={duplicates[order.id] ?? []}
                onOpen={() => setOpenId(order.id)}
                onStatus={(next) => updateStatus(order, next)}
              />
            ))}
            {emptyCopy ? (
              <div className="rounded-[14px] border border-[#e2e7ee] bg-white px-[18px] py-11 text-center text-[14px] text-[#8a93a2]">
                {emptyCopy}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {view === "board" && emptyCopy && boardColumns.length === 0 ? (
        <div className="rounded-[14px] border border-[#e2e7ee] bg-white px-[18px] py-11 text-center text-[14px] text-[#8a93a2]">
          {emptyCopy}
        </div>
      ) : null}

      {openOrder ? (
        <OrderDetailDrawer
          catalogId={catalogId}
          order={openOrder}
          lines={itemsByOrder.get(openOrder.id) ?? []}
          events={events.filter((event) => event.order_id === openOrder.id)}
          statuses={statuses}
          currency={currency}
          showFulfillment={showFulfillment}
          thumbs={thumbs}
          checkoutForm={checkoutForm}
          onClose={() => setOpenId(null)}
          onStatus={(next) => updateStatus(openOrder, next)}
          onCopied={(message) => setToast(message)}
        />
      ) : null}

      {toast ? (
        <div className="orders-toast pointer-events-none fixed bottom-6 left-1/2 z-[80] max-w-[92vw] -translate-x-1/2">
          <div className="rounded-full bg-[#101720] px-[18px] py-3 text-[13px] text-white shadow-[0_10px_30px_rgba(16,23,32,0.25)]">
            {toast}
          </div>
        </div>
      ) : null}
      <style>{`
        @keyframes orders-toast-in { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .orders-toast { animation: orders-toast-in 0.18s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .orders-toast { animation: none; }
        }
      `}</style>
    </div>
  );
}

function FilterPill({
  label,
  selected,
  dot,
  onClick,
}: {
  label: string;
  selected: boolean;
  dot?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium"
      style={{
        background: selected ? "#101720" : "#fff",
        color: selected ? "#fff" : "#46505e",
        borderColor: selected ? "#101720" : "#e2e7ee",
      }}
    >
      {dot ? <span className="h-2 w-2 rounded-full" style={{ background: dot }} /> : null}
      {label}
    </button>
  );
}

function StatusSelect({
  id,
  reference,
  value,
  options,
  color,
  onChange,
  large,
}: {
  id: string;
  reference: string;
  value: string;
  options: OrderStatusDef[];
  color?: string;
  onChange: (next: string) => void;
  large?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-[7px] rounded-[10px] border p-[3px]"
      style={{ borderColor: color || "#e2e7ee", background: statusTint(color) }}
      onClick={(event) => event.stopPropagation()}
    >
      {color ? (
        <span className="ml-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      ) : null}
      <label className="sr-only" htmlFor={id}>
        Status for {reference}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 flex-1 cursor-pointer border-0 bg-transparent pr-1.5 text-[13px] font-medium text-[var(--cat-ink)] ${
          large ? "min-h-11 text-[14px]" : "min-h-9"
        }`}
      >
        {options.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function statusOptions(statuses: OrderStatusDef[], current: string): OrderStatusDef[] {
  return statuses.some((row) => row.id === current)
    ? statuses
    : [...statuses, { id: current, label: statusLabel(statuses, current), sort: statuses.length, is_done: false }];
}

function customerExtra(order: OrderRow, showFulfillment: boolean): string {
  return [
    order.phone,
    showFulfillment && order.fulfillment ? fulfillmentLabel(order.fulfillment) : "",
    showFulfillment && order.table_no ? `Table ${order.table_no}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function DesktopRow({
  order,
  lines,
  currency,
  showFulfillment,
  statuses,
  duplicateRefs,
  selected,
  onOpen,
  onStatus,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  showFulfillment: boolean;
  statuses: OrderStatusDef[];
  duplicateRefs: string[];
  selected: boolean;
  onOpen: () => void;
  onStatus: (next: string) => void;
}) {
  const current = statuses.find((row) => row.id === order.status);
  const color = current?.color || "#86868b";
  const extra = customerExtra(order, showFulfillment);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer items-center gap-3.5 border-b border-[#edf0f4] border-l-4 px-[18px] py-3 last:border-b-0"
      style={{
        background: selected ? statusTintStrong(color) : statusTint(color),
        borderLeftColor: color,
      }}
    >
      <div className="flex min-w-0 flex-[1_1_170px] flex-col gap-1">
        <span className="font-mono text-[13px] font-medium text-[var(--cat-ink)]">{order.reference}</span>
        <span suppressHydrationWarning className="text-[12px] text-[#8a93a2]">
          {formatOrderDateTime(order.created_at)}
        </span>
        {duplicateRefs.length > 0 ? (
          <span className="mt-0.5 self-start rounded-full bg-[#fdf3e6] px-2 py-[3px] text-[11px] text-[#a1670a]">
            Possible duplicate · {duplicateRefs.join(", ")}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-[3px]">
        <span className="truncate text-[14px] text-[var(--cat-ink)]">{order.shop_name || "Guest"}</span>
        {extra ? <span className="truncate text-[12px] text-[#8a93a2]">{extra}</span> : null}
      </div>
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px] text-[13px] text-[#46505e]">
        {itemLines(lines).map((line) => (
          <span key={line} className="truncate">
            {line}
          </span>
        ))}
      </div>
      <div className="w-[110px] shrink-0 text-right text-[14px] tabular-nums text-[var(--cat-ink)]">
        {formatMoney(Number(order.subtotal), currency)}
      </div>
      <div className="w-[176px] shrink-0">
        <StatusSelect
          id={`order-status-${order.id}`}
          reference={order.reference}
          value={order.status}
          options={statusOptions(statuses, order.status)}
          color={current?.color}
          onChange={onStatus}
        />
      </div>
    </div>
  );
}

function MobileCard({
  order,
  lines,
  currency,
  showFulfillment,
  statuses,
  duplicateRefs,
  onOpen,
  onStatus,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  showFulfillment: boolean;
  statuses: OrderStatusDef[];
  duplicateRefs: string[];
  onOpen: () => void;
  onStatus: (next: string) => void;
}) {
  const current = statuses.find((row) => row.id === order.status);
  const color = current?.color || "#86868b";
  const extra = customerExtra(order, showFulfillment);

  return (
    <article
      role="button"
      tabIndex={0}
      className="cursor-pointer overflow-hidden rounded-[14px] border border-l-4"
      style={{
        background: statusTint(color),
        borderColor: statusEdge(color),
        borderLeftColor: color,
      }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3.5 py-2.5"
        style={{ background: statusTintStrong(color), borderColor: statusEdge(color) }}
      >
        <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
        <span className="min-w-0 flex-1 text-[13px] font-semibold">{current?.label || statusLabel(statuses, order.status)}</span>
        <span suppressHydrationWarning className="text-[11px] text-[#46505e]">
          {formatOrderDateTime(order.created_at)}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <div className="flex items-baseline gap-2.5">
          <span className="min-w-0 flex-1 font-mono text-[13px] font-medium">{order.reference}</span>
          <span className="text-[16px] font-semibold tabular-nums">
            {formatMoney(Number(order.subtotal), currency)}
          </span>
        </div>
        <div className="text-[14px]">{order.shop_name || "Guest"}</div>
        {extra ? <div className="text-[12px] text-[#8a93a2]">{extra}</div> : null}
        {duplicateRefs.length > 0 ? (
          <span className="self-start rounded-full bg-[#fdf3e6] px-2 py-[3px] text-[11px] text-[#a1670a]">
            Possible duplicate · {duplicateRefs.join(", ")}
          </span>
        ) : null}
        <div className="text-[13px] leading-relaxed text-[#46505e]">{itemsSummary(lines)}</div>
        <StatusSelect
          id={`order-status-mobile-${order.id}`}
          reference={order.reference}
          value={order.status}
          options={statusOptions(statuses, order.status)}
          color={color}
          onChange={onStatus}
          large
        />
      </div>
    </article>
  );
}

function BoardCard({
  order,
  lines,
  currency,
  showFulfillment,
  statuses,
  duplicateRefs,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onOpen,
  onStatus,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  showFulfillment: boolean;
  statuses: OrderStatusDef[];
  duplicateRefs: string[];
  dragging: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onOpen: () => void;
  onStatus: (next: string) => void;
}) {
  const current = statuses.find((row) => row.id === order.status);
  const color = current?.color || "#86868b";

  return (
    <article
      role="button"
      tabIndex={0}
      className={`flex flex-col gap-[7px] rounded-xl border border-l-4 px-3 py-[11px] touch-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        background: statusTint(color),
        borderColor: statusEdge(color),
        borderLeftColor: color,
        opacity: dragging ? 0.35 : 1,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 font-mono text-[13px] font-medium">{order.reference}</span>
        <span suppressHydrationWarning className="text-[11px] text-[#8a93a2]">
          {formatOrderDateTime(order.created_at)}
        </span>
      </div>
      <div className="text-[14px]">{order.shop_name || "Guest"}</div>
      {showFulfillment && (order.fulfillment || order.table_no) ? (
        <div className="text-[12px] text-[#8a93a2]">{customerExtra(order, showFulfillment)}</div>
      ) : null}
      {duplicateRefs.length > 0 ? (
        <span className="self-start rounded-full bg-[#fdf3e6] px-2 py-[3px] text-[11px] text-[#a1670a]">
          Possible duplicate · {duplicateRefs.join(", ")}
        </span>
      ) : null}
      <div className="text-[12px] leading-relaxed text-[#5a6472]">{itemsSummary(lines)}</div>
      <div className="text-[15px] font-semibold tabular-nums">
        {formatMoney(Number(order.subtotal), currency)}
      </div>
      <StatusSelect
        id={`order-status-board-${order.id}`}
        reference={order.reference}
        value={order.status}
        options={statusOptions(statuses, order.status)}
        color={color}
        onChange={onStatus}
      />
    </article>
  );
}

function DragGhost({
  order,
  statuses,
  currency,
  drag,
}: {
  order: OrderRow | null;
  statuses: OrderStatusDef[];
  currency: string;
  drag: DragState;
}) {
  if (!order) return null;
  const current = statuses.find((row) => row.id === order.status);
  const color = current?.color || "#86868b";
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[70] rounded-xl border border-l-4 px-3 py-[11px] shadow-[0_12px_32px_rgba(16,23,32,0.22)]"
      style={{
        left: drag.x - drag.offsetX,
        top: drag.y - drag.offsetY,
        width: drag.width,
        background: statusTint(color),
        borderColor: statusEdge(color),
        borderLeftColor: color,
        transform: "rotate(2deg) scale(1.02)",
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 font-mono text-[13px] font-medium">{order.reference}</span>
        <span className="text-[15px] font-semibold tabular-nums">
          {formatMoney(Number(order.subtotal), currency)}
        </span>
      </div>
      <div className="mt-1 text-[14px]">{order.shop_name || "Guest"}</div>
    </div>
  );
}
