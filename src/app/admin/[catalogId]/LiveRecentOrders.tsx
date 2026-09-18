"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { formatOrderDateTime, statusById, type OrderStatusDef } from "@/lib/catalog/order-statuses";
import type { OrderRow } from "@/lib/supabase/types";
import { dashCard } from "@/components/admin/dashboard/styles";
import { FulfillmentTypeBadge } from "@/components/orders/FulfillmentTypeBadge";
import {
  announceNewOrder,
  asCatalogOrder,
  fetchCatalogOrders,
  newcomersToast,
  rowCatalogId,
  rowId,
  useCatalogLiveChannel,
  useLiveRefresh,
} from "@/lib/catalog/live-orders";
import type { NotifySoundSettings } from "@/lib/catalog/template-settings";
import { DEFAULT_TEMPLATE_SETTINGS } from "@/lib/catalog/template-settings";

function relativeTime(iso: string, now: number | null): string {
  if (now == null) return formatOrderDateTime(iso);
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.round((now - t) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatOrderDateTime(iso);
}

function statusDot(statuses: OrderStatusDef[], id: string): string {
  return statusById(statuses, id)?.color ?? "#8a93a2";
}

export function LiveRecentOrders({
  catalogId,
  currency,
  initialOrders,
  statuses,
  sounds = DEFAULT_TEMPLATE_SETTINGS.notify,
}: {
  catalogId: string;
  currency: string;
  initialOrders: OrderRow[];
  statuses: OrderStatusDef[];
  sounds?: NotifySoundSettings;
}) {
  const [orders, setOrders] = useState(initialOrders.filter((order) => order.catalog_id === catalogId));
  const [toast, setToast] = useState<string | null>(null);
  const [notifyAsk, setNotifyAsk] = useState<"hidden" | "ask" | "on">("hidden");
  const [now, setNow] = useState<number | null>(null);
  const seenIds = useRef(new Set(initialOrders.map((order) => order.id)));
  const hydrated = useRef(false);

  const markSeen = useCallback(
    (incoming: OrderRow[]) => {
      const newcomers = incoming.filter((order) => !seenIds.current.has(order.id));
      if (hydrated.current && newcomers.length > 0) {
        for (const order of newcomers) {
          seenIds.current.add(order.id);
          announceNewOrder(order, sounds);
        }
        setToast(newcomersToast(newcomers));
      } else {
        for (const order of incoming) seenIds.current.add(order.id);
      }
      hydrated.current = true;
    },
    [sounds],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCatalogOrders(catalogId, 4);
      markSeen(next);
      setOrders(next);
    } catch {
      // poll retries
    }
  }, [catalogId, markSeen]);

  const ingestInsert = useCallback(
    async (hint: OrderRow | null, orderId: string | null) => {
      try {
        const incoming = hint ?? (orderId
          ? (await fetchCatalogOrders(catalogId, 4)).find((row) => row.id === orderId) ?? null
          : null);
        if (!incoming || incoming.catalog_id !== catalogId) {
          void refresh();
          return;
        }
        markSeen([incoming]);
        setOrders((prev) => [incoming, ...prev.filter((row) => row.id !== incoming.id)].slice(0, 4));
      } catch {
        void refresh();
      }
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
    const start = window.setTimeout(() => {
      setNow(Date.now());
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "granted") setNotifyAsk("on");
      else if (Notification.permission === "default") setNotifyAsk("ask");
    }, 0);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <section className={dashCard}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f4] px-4 py-3.5 sm:px-[18px]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1e9e4a] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1e9e4a]" />
          </span>
          <h3 className="m-0 text-[15px] font-semibold tracking-tight text-[var(--cat-ink)]">
            Recent orders
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {notifyAsk === "ask" ? (
            <button
              type="button"
              onClick={() => {
                void Notification.requestPermission().then((permission) => {
                  setNotifyAsk(permission === "granted" ? "on" : "hidden");
                });
              }}
              className="min-h-11 text-[13px] text-[#5a6472] hover:text-[var(--cat-ink)]"
            >
              Notify
            </button>
          ) : null}
          <Link href={`/admin/${catalogId}/orders`} className="min-h-11 text-[13px] leading-[44px] text-[#0b5fce]">
            Open inbox
          </Link>
        </div>
      </div>
      {toast ? (
        <p className="mx-4 mt-3 rounded-[11px] bg-[#101720] px-3 py-2 text-[13px] font-medium text-white sm:mx-[18px]">
          {toast}
        </p>
      ) : null}
      <div className="flex flex-col">
        {orders.length === 0 ? (
          <p className="px-4 py-9 text-center text-[13px] leading-relaxed text-[#8a93a2] sm:px-[18px]">
            No orders yet. They will show up here when a guest places one.
          </p>
        ) : (
          orders.map((order) => {
            const when = relativeTime(order.created_at, now);
            return (
              <Link
                key={order.id}
                href={`/admin/${catalogId}/orders?order=${order.id}`}
                className="flex min-h-11 items-center gap-3 border-b border-[#f1f4f8] px-4 py-3 text-[var(--cat-ink)] last:border-b-0 hover:bg-[#fafbfd] sm:px-[18px]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: statusDot(statuses, order.status) }}
                  title={statusById(statuses, order.status)?.label ?? order.status}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <FulfillmentTypeBadge order={order} compact />
                    <span className="truncate text-[14px]">{order.shop_name || "Guest"}</span>
                  </span>
                  <span className="block truncate font-mono text-[12px] text-[#8a93a2] sm:hidden">
                    {order.reference}
                    {when ? ` · ${when}` : ""}
                  </span>
                </span>
                <span className="hidden shrink-0 font-mono text-[12px] text-[#8a93a2] sm:inline">
                  {order.reference}
                </span>
                <span className="hidden shrink-0 text-[12px] text-[#8a93a2] sm:inline">
                  {when}
                </span>
                <span className="shrink-0 text-[14px] tabular-nums">
                  {formatMoney(Number(order.subtotal), currency)}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
