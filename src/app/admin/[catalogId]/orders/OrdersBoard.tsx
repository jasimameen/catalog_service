"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/catalog/currency";
import { FULFILLMENTS } from "@/lib/catalog/checkout-form";
import type { ItemThumb } from "@/lib/catalog/combos";
import {
  findDuplicateRefs,
  formatOrderTime,
  nextWorkflowAction,
  ORDER_FILTER_INCLUDE_EVENT,
  statusLabel,
  WORKFLOW_LANES,
  workflowLane,
  statusesForLane,
  type OrderFilterIncludeDetail,
  type OrderStatusDef,
  type WorkflowLaneId,
} from "@/lib/catalog/order-statuses";
import { FulfillmentTypeBadge } from "@/components/orders/FulfillmentTypeBadge";
import type { CheckoutFormField, OrderItemRow, OrderRow } from "@/lib/supabase/types";
import type { OrderStatusEventRow } from "@/lib/supabase/types";
import { claimOrder, setOrderStatus } from "./actions";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import {
  announceNewOrder,
  asCatalogOrder,
  fetchCatalogOrders,
  fetchOrderEvents,
  fetchOrderItems,
  fetchOrderWithItems,
  newcomersToast,
  rowCatalogId,
  rowId,
  useCatalogLiveChannel,
  useLiveRefresh,
} from "@/lib/catalog/live-orders";
import type { NotifySoundSettings } from "@/lib/catalog/template-settings";
import type { OrderFulfillment } from "@/lib/supabase/types";

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
  enableClaim,
  notify,
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
  enableClaim: boolean;
  notify: NotifySoundSettings;
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
  const [loadError, setLoadError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fulfillFilter, setFulfillFilter] = useState<OrderFulfillment | "all" | "unclaimed">("all");
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

  const markSeen = useCallback(
    (incoming: OrderRow[]) => {
      const newcomers = incoming.filter((order) => !seenIds.current.has(order.id));
      if (hydrated.current && newcomers.length > 0) {
        for (const order of newcomers) {
          seenIds.current.add(order.id);
          announceNewOrder(order, notify);
        }
        setToast(newcomersToast(newcomers));
      } else {
        for (const order of incoming) seenIds.current.add(order.id);
      }
      hydrated.current = true;
    },
    [notify],
  );

  const applyList = useCallback(
    (nextOrders: OrderRow[], nextItems: OrderItemRow[], nextEvents: OrderStatusEventRow[]) => {
      const nextByOrder = new Map<string, OrderItemRow[]>();
      for (const line of nextItems) {
        const list = nextByOrder.get(line.order_id) ?? [];
        list.push(line);
        nextByOrder.set(line.order_id, list);
      }
      setOrders(nextOrders);
      setItems(nextItems);
      setEvents(nextEvents);
      setDuplicates(Object.fromEntries(findDuplicateRefs(nextOrders, nextByOrder, statuses)));
    },
    [statuses],
  );

  const refresh = useCallback(async () => {
    try {
      const nextOrders = await fetchCatalogOrders(catalogId);
      const ids = nextOrders.map((order) => order.id);
      const [nextItems, nextEvents] = await Promise.all([fetchOrderItems(ids), fetchOrderEvents(ids)]);
      markSeen(nextOrders);
      applyList(nextOrders, nextItems, nextEvents);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [applyList, catalogId, markSeen]);

  const ingestInsert = useCallback(
    async (hint: OrderRow | null, orderId: string | null) => {
      const id = hint?.id ?? orderId;
      if (!id) {
        void refresh();
        return;
      }
      if (hint && hint.catalog_id === catalogId) {
        setOrders((prev) => [hint, ...prev.filter((row) => row.id !== hint.id)]);
      }
      const load = async () => fetchOrderWithItems(catalogId, id);
      let bundle = await load();
      if (bundle.order && bundle.items.length === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        bundle = await load();
      }
      const full = bundle.order ?? hint;
      if (!full || full.catalog_id !== catalogId) {
        void refresh();
        return;
      }
      markSeen([full]);
      setOrders((prev) => [full, ...prev.filter((row) => row.id !== full.id)]);
      setItems((prev) => [...prev.filter((line) => line.order_id !== full.id), ...bundle.items]);
    },
    [catalogId, markSeen, refresh],
  );

  const onRealtime = useCallback(
    (table: "orders" | "service_requests" | "reservations", eventType: string, row: unknown) => {
      if (table !== "orders") return;
      const cid = rowCatalogId(row);
      if (cid && cid !== catalogId) return;
      if (eventType === "INSERT") {
        void ingestInsert(asCatalogOrder(row, catalogId), rowId(row));
        return;
      }
      void refresh();
    },
    [catalogId, ingestInsert, refresh],
  );

  useCatalogLiveChannel(catalogId, ["orders"], onRealtime);
  useLiveRefresh(refresh);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (typeof Notification === "undefined") {
        setNotifyPermission("unsupported");
      } else {
        setNotifyPermission(Notification.permission);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(`catalog-orders-view:${catalogId}`);
        if (stored === "board" || stored === "table") setView(stored);
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(t);
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
    return orders.filter((order) => {
      if (!allowed.has(order.status)) return false;
      if (fulfillFilter === "unclaimed") return !order.claimed_at;
      if (fulfillFilter === "all") return true;
      return order.fulfillment === fulfillFilter;
    });
  }, [filter, fulfillFilter, orders]);

  async function takeOrder(order: OrderRow) {
    const result = await claimOrder(catalogId, order.id);
    if (result.error) {
      setToast(result.error);
      return;
    }
    setOrders((prev) =>
      prev.map((row) =>
        row.id === order.id
          ? { ...row, claimed_at: new Date().toISOString(), claimed_by: result.claimed_by ?? "Taken" }
          : row,
      ),
    );
  }

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

  const laneCounts = useMemo(() => {
    const next: Record<WorkflowLaneId, number> = { new: 0, kitchen: 0, ready: 0, done: 0 };
    for (const order of orders) {
      next[workflowLane(order.status, filterStatuses)] += 1;
    }
    return next;
  }, [filterStatuses, orders]);

  const activeLane = useMemo((): WorkflowLaneId | "open" | "all" | null => {
    if (isOpenFilter) return "open";
    if (isAllFilter) return "all";
    for (const lane of WORKFLOW_LANES) {
      const ids = statusesForLane(lane.id, filterStatuses);
      if (ids.length > 0 && sameIds(filter, ids)) return lane.id;
    }
    return null;
  }, [filter, filterStatuses, isAllFilter, isOpenFilter]);

  function showLane(lane: WorkflowLaneId) {
    const next = statusesForLane(lane, filterStatuses);
    if (next.length === 0) return;
    setFilter(next);
    writeFilterUrl(catalogId, next);
  }

  const emptyCopy =
    visible.length === 0
      ? orders.length === 0
        ? "No food orders yet. When a guest orders — or pre-orders with a booking — it lands here."
        : fulfillFilter !== "all" && fulfillFilter !== "unclaimed"
          ? `No ${fulfillFilter === "dine_in" ? "dine-in" : fulfillFilter} orders in this step.`
          : activeLane === "kitchen"
            ? "Nothing in the kitchen right now."
            : activeLane === "ready"
              ? "Nothing waiting to go out."
              : activeLane === "new"
                ? "No new orders to accept."
                : "Nothing matches these filters."
      : "";
  const boardColumns = filterStatuses.filter((status) => filter.includes(status.id));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="m-0 min-w-0 flex-1 basis-60 text-[13px] text-[#5a6472]">
          Accept new tickets, cook, then mark ready. Bookings live on the Reservations tab.
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

      {loadError ? (
        <p className="m-0 rounded-[11px] border border-[#f3d2ce] bg-[#fff5f4] px-3.5 py-2.5 text-[13px] text-[#b42318]">
          Could not refresh orders. New ones still appear within a few seconds.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:thin]">
          <FilterPill label={`Open ${orders.filter((row) => !filterStatuses.find((s) => s.id === row.status)?.is_done).length}`} selected={isOpenFilter} onClick={showOpenOnly} />
          {WORKFLOW_LANES.map((lane) => (
            <FilterPill
              key={lane.id}
              label={`${lane.label} ${laneCounts[lane.id]}`}
              selected={activeLane === lane.id}
              onClick={() => showLane(lane.id)}
            />
          ))}
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
          <FilterPill label="All types" selected={fulfillFilter === "all"} onClick={() => setFulfillFilter("all")} />
          {FULFILLMENTS.map((mode) => (
            <FilterPill
              key={mode.value}
              label={mode.label}
              selected={fulfillFilter === mode.value}
              onClick={() => setFulfillFilter(mode.value)}
            />
          ))}
          {enableClaim ? (
            <FilterPill
              label="Unclaimed"
              selected={fulfillFilter === "unclaimed"}
              onClick={() => setFulfillFilter("unclaimed")}
            />
          ) : null}
        </div>
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
                      enableClaim={enableClaim}
                      statuses={statuses}
                      duplicateRefs={duplicates[order.id] ?? []}
                      onTake={() => void takeOrder(order)}
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
              <div className="min-w-[720px]">
                <div className="flex items-center gap-2 border-b border-[#edf0f4] bg-[#fbfbfd] px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[#8a93a2]">
                  <div className="w-[118px] shrink-0">Type</div>
                  <div className="min-w-0 flex-1">Order</div>
                  <div className="w-[58px] shrink-0 text-right">Time</div>
                  <div className="w-[88px] shrink-0 text-right">Total</div>
                  <div className="w-[108px] shrink-0">Next</div>
                </div>
                {visible.map((order) => (
                  <DesktopRow
                    key={order.id}
                    order={order}
                    lines={itemsByOrder.get(order.id) ?? []}
                    currency={currency}
                    showFulfillment={showFulfillment}
                    enableClaim={enableClaim}
                    statuses={statuses}
                    duplicateRefs={duplicates[order.id] ?? []}
                    onTake={() => void takeOrder(order)}
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
                enableClaim={enableClaim}
                statuses={statuses}
                duplicateRefs={duplicates[order.id] ?? []}
                onTake={() => void takeOrder(order)}
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

function NextActionButton({
  order,
  statuses,
  onStatus,
}: {
  order: OrderRow;
  statuses: OrderStatusDef[];
  onStatus: (next: string) => void;
}) {
  const action = nextWorkflowAction(order.status, statuses);
  if (!action) {
    return <span className="text-[12px] text-[var(--cat-muted)]">Done</span>;
  }
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onStatus(action.nextId);
      }}
      className="inline-flex min-h-8 w-full items-center justify-center rounded-lg bg-[var(--cat-ink)] px-2.5 text-[12px] font-semibold text-white"
    >
      {action.label}
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
      className="flex items-center gap-1 rounded-lg border p-0.5"
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
        className={`min-w-0 flex-1 cursor-pointer border-0 bg-transparent pr-1.5 font-medium text-[var(--cat-ink)] ${
          large ? "min-h-11 text-[14px]" : "min-h-7 text-[12px]"
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

function DesktopRow({
  order,
  lines,
  currency,
  showFulfillment,
  enableClaim,
  statuses,
  duplicateRefs,
  selected,
  onOpen,
  onStatus,
  onTake,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  showFulfillment: boolean;
  enableClaim: boolean;
  statuses: OrderStatusDef[];
  duplicateRefs: string[];
  selected: boolean;
  onOpen: () => void;
  onStatus: (next: string) => void;
  onTake: () => void;
}) {
  const current = statuses.find((row) => row.id === order.status);
  const color = current?.color || "#86868b";
  const units = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);

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
      className="flex cursor-pointer items-center gap-2 border-b border-[#edf0f4] border-l-[3px] px-3 py-1.5 last:border-b-0"
      style={{
        background: selected ? statusTintStrong(color) : "#fff",
        borderLeftColor: color,
      }}
    >
      <div className="w-[118px] shrink-0">
        <FulfillmentTypeBadge order={order} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-[var(--cat-ink)]">{order.shop_name || "Guest"}</span>
          <span className="shrink-0 font-mono text-[11px] text-[var(--cat-muted)]">{order.reference}</span>
        </div>
        <div className="truncate text-[12px] text-[var(--cat-muted)]">
          {itemsSummary(lines)}
          {units > 0 ? ` · ${units}` : ""}
        </div>
        {duplicateRefs.length > 0 ? (
          <span className="text-[10px] text-[#a1670a]">Possible duplicate · {duplicateRefs.join(", ")}</span>
        ) : null}
        {enableClaim ? <ClaimControl order={order} onTake={onTake} /> : null}
      </div>
      <div suppressHydrationWarning className="w-[58px] shrink-0 text-right text-[12px] tabular-nums text-[var(--cat-muted)]">
        {formatOrderTime(order.created_at)}
      </div>
      <div className="w-[88px] shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--cat-ink)]">
        {formatMoney(Number(order.subtotal), currency)}
      </div>
      <div className="w-[108px] shrink-0" onClick={(event) => event.stopPropagation()}>
        <NextActionButton order={order} statuses={statuses} onStatus={onStatus} />
      </div>
    </div>
  );
}

function MobileCard({
  order,
  lines,
  currency,
  showFulfillment,
  enableClaim,
  statuses,
  duplicateRefs,
  onOpen,
  onStatus,
  onTake,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  showFulfillment: boolean;
  enableClaim: boolean;
  statuses: OrderStatusDef[];
  duplicateRefs: string[];
  onOpen: () => void;
  onStatus: (next: string) => void;
  onTake: () => void;
}) {
  const current = statuses.find((row) => row.id === order.status);
  const color = current?.color || "#86868b";
  const units = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  void showFulfillment;

  return (
    <article
      role="button"
      tabIndex={0}
      className="cursor-pointer overflow-hidden rounded-[12px] border border-l-[3px] bg-white"
      style={{
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
      <div className="flex items-center gap-2 px-2.5 py-2">
        <FulfillmentTypeBadge order={order} compact />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 font-mono text-[12px] font-medium">{order.reference}</span>
            <span className="truncate text-[12px] text-[var(--cat-muted)]">{order.shop_name || "Guest"}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--cat-muted)]">
            <span>{units} items</span>
            <span suppressHydrationWarning>{formatOrderTime(order.created_at)}</span>
            <span>{current?.label || statusLabel(statuses, order.status)}</span>
          </div>
        </div>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums">
          {formatMoney(Number(order.subtotal), currency)}
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-[#edf0f4] px-2.5 py-1.5">
        {enableClaim ? <ClaimControl order={order} onTake={onTake} /> : null}
        {duplicateRefs.length > 0 ? (
          <span className="text-[10px] text-[#a1670a]">Duplicate</span>
        ) : null}
        <div className="ml-auto w-[120px]" onClick={(event) => event.stopPropagation()}>
          <NextActionButton order={order} statuses={statuses} onStatus={onStatus} />
        </div>
      </div>
    </article>
  );
}

function BoardCard({
  order,
  lines,
  currency,
  showFulfillment,
  enableClaim,
  statuses,
  duplicateRefs,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onOpen,
  onStatus,
  onTake,
}: {
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
  showFulfillment: boolean;
  enableClaim: boolean;
  statuses: OrderStatusDef[];
  duplicateRefs: string[];
  dragging: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onOpen: () => void;
  onStatus: (next: string) => void;
  onTake: () => void;
}) {
  const current = statuses.find((row) => row.id === order.status);
  const color = current?.color || "#86868b";

  return (
    <article
      role="button"
      tabIndex={0}
      className={`flex flex-col gap-1 rounded-[11px] border border-l-[3px] px-2.5 py-2 touch-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        background: "#fff",
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
      <div className="flex items-center gap-2">
        <FulfillmentTypeBadge order={order} compact />
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-medium">{order.reference}</span>
        <span suppressHydrationWarning className="text-[11px] text-[#8a93a2]">
          {formatOrderTime(order.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[12px]">
        <span className="min-w-0 flex-1 truncate text-[var(--cat-ink)]">{order.shop_name || "Guest"}</span>
        <span className="shrink-0 text-[11px] text-[var(--cat-muted)]">{lines.reduce((sum, line) => sum + Number(line.qty || 0), 0)} items</span>
      </div>
      {showFulfillment && order.location && order.fulfillment === "delivery" ? (
        <div className="truncate text-[11px] text-[#8a93a2]">{order.location}</div>
      ) : null}
      {enableClaim ? <ClaimControl order={order} onTake={onTake} /> : null}
      {duplicateRefs.length > 0 ? (
        <span className="self-start rounded-full bg-[#fdf3e6] px-2 py-[3px] text-[11px] text-[#a1670a]">
          Possible duplicate · {duplicateRefs.join(", ")}
        </span>
      ) : null}
      <div className="text-[12px] leading-relaxed text-[#5a6472]">{itemsSummary(lines)}</div>
      <div className="text-[15px] font-semibold tabular-nums">
        {formatMoney(Number(order.subtotal), currency)}
      </div>
      <NextActionButton order={order} statuses={statuses} onStatus={onStatus} />
    </article>
  );
}

function ClaimControl({ order, onTake }: { order: OrderRow; onTake: () => void }) {
  if (order.claimed_at) {
    return <span className="text-[11px] text-[#1e9e4a]">Taken · {order.claimed_by || "staff"}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c27c0e] opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c27c0e]" />
      </span>
      <span className="rounded-full bg-[#fff3d6] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]">
        Unclaimed
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTake();
        }}
        className="self-start rounded-full border border-[#101720] px-2.5 py-1 text-[11px] font-semibold"
      >
        Take
      </button>
    </span>
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
