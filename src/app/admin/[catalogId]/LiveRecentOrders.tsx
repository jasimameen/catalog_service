"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { formatOrderDateTime, statusById, workflowLane, type OrderStatusDef } from "@/lib/catalog/order-statuses";
import type { OrderRow } from "@/lib/supabase/types";
import { OrderHero, StatusCue } from "@/components/admin/ops/OpsChrome";
import {
  asCatalogOrder,
  fetchCatalogOrders,
  rowCatalogId,
  rowId,
  useCatalogLiveChannel,
  useLiveRefresh,
} from "@/lib/catalog/live-orders";
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

export function LiveRecentOrders({
  catalogId,
  currency,
  initialOrders,
  statuses,
}: {
  catalogId: string;
  currency: string;
  initialOrders: OrderRow[];
  statuses: OrderStatusDef[];
}) {
  const [orders, setOrders] = useState(initialOrders.filter((order) => order.catalog_id === catalogId));
  const [notifyAsk, setNotifyAsk] = useState<"hidden" | "ask" | "on">("hidden");
  const [now, setNow] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCatalogOrders(catalogId, 4);
      setOrders(next);
    } catch {
      // poll retries
    }
  }, [catalogId]);

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
        setOrders((prev) => [incoming, ...prev.filter((row) => row.id !== incoming.id)].slice(0, 4));
      } catch {
        void refresh();
      }
    },
    [catalogId, refresh],
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

  return (
    <section className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,23,32,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-[18px]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1e9e4a] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1e9e4a]" />
          </span>
          <h3 className="m-0 text-[15px] font-semibold tracking-tight text-[var(--cat-ink)]">
            Live orders
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
              className="ops-press min-h-11 text-[13px] text-[#5a6472] hover:text-[var(--cat-ink)]"
            >
              Notify
            </button>
          ) : null}
          <Link href={`/admin/${catalogId}/orders`} className="ops-press min-h-11 text-[13px] leading-[44px] text-[#0b5fce]">
            Open
          </Link>
        </div>
      </div>
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
                className="ops-press flex min-h-11 items-center gap-3 px-4 py-3 text-[var(--cat-ink)] no-underline last:pb-4 hover:bg-[#fafbfd] sm:px-[18px]"
              >
                <span className="min-w-0 flex-1">
                  <OrderHero order={order} />
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[#86868b]">
                    <StatusCue
                      lane={workflowLane(order.status, statuses)}
                      label={statusById(statuses, order.status)?.label ?? order.status}
                    />
                    <span suppressHydrationWarning>{when}</span>
                  </span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums tracking-tight">
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
