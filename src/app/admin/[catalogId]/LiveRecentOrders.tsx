"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { formatOrderDateTime, statusById, type OrderStatusDef } from "@/lib/catalog/order-statuses";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { OrderRow } from "@/lib/supabase/types";
import { dashCard } from "@/components/admin/dashboard/styles";

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
}: {
  catalogId: string;
  currency: string;
  initialOrders: OrderRow[];
  statuses: OrderStatusDef[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [toast, setToast] = useState<string | null>(null);
  const [notify, setNotify] = useState<"hidden" | "ask" | "on">("hidden");
  const [now, setNow] = useState<number | null>(null);
  const seenIds = useRef(new Set(initialOrders.map((order) => order.id)));
  const hydrated = useRef(false);

  const refresh = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("catalog_id", catalogId)
      .order("created_at", { ascending: false })
      .limit(4);
    const next = (data ?? []) as OrderRow[];
    const newcomers = next.filter((order) => !seenIds.current.has(order.id));
    if (hydrated.current && newcomers.length > 0) {
      for (const order of newcomers) {
        seenIds.current.add(order.id);
        notifyNewOrder(order);
      }
      setToast(
        newcomers.length === 1 ? `New order ${newcomers[0]!.reference}` : `${newcomers.length} new orders`,
      );
    } else {
      for (const order of next) seenIds.current.add(order.id);
    }
    hydrated.current = true;
    setOrders(next);
  }, [catalogId]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`dashboard-orders:${catalogId}`)
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
    setNow(Date.now());
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") setNotify("on");
    else if (Notification.permission === "default") setNotify("ask");
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
          {notify === "ask" ? (
            <button
              type="button"
              onClick={() => {
                void Notification.requestPermission().then((permission) => {
                  setNotify(permission === "granted" ? "on" : "hidden");
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
            No orders yet. They will show up here when a shop places one.
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
                  <span className="block truncate text-[14px]">
                    {order.shop_name || "Guest"}
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
