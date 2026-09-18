"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { OrderItemRow, OrderRow, OrderStatusEventRow, ReservationRow, ServiceRequestRow } from "@/lib/supabase/types";
import type { NotifySoundSettings } from "./template-settings";
import {
  notifyBody,
  notifyBrowserTitle,
  notifyKind,
  notifyToastTitle,
  playOrderTone,
  shouldPlayNotify,
} from "./order-notify";

export const LIVE_POLL_MS = 4000;

type ChangeRow = Record<string, unknown>;

function asRecord(value: unknown): ChangeRow | null {
  if (!value || typeof value !== "object") return null;
  return value as ChangeRow;
}

export function rowCatalogId(value: unknown): string | null {
  const rec = asRecord(value);
  return typeof rec?.catalog_id === "string" ? rec.catalog_id : null;
}

export function rowId(value: unknown): string | null {
  const rec = asRecord(value);
  return typeof rec?.id === "string" && rec.id ? rec.id : null;
}

/** Full enough to render a card. Items may still need a follow-up fetch. */
export function asCatalogOrder(value: unknown, catalogId: string): OrderRow | null {
  const rec = asRecord(value);
  if (!rec) return null;
  if (rec.catalog_id !== catalogId) return null;
  if (typeof rec.id !== "string" || typeof rec.reference !== "string") return null;
  return rec as unknown as OrderRow;
}

export function announceNewOrder(order: OrderRow, sounds: NotifySoundSettings): void {
  const kind = notifyKind(order.fulfillment);
  if (shouldPlayNotify(sounds, kind)) playOrderTone(kind);
  flashDocumentTitle(notifyBrowserTitle(kind));
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(notifyBrowserTitle(kind), { body: notifyBody(order) });
    } catch {
      // ignore
    }
  }
}

function flashDocumentTitle(flash: string): void {
  if (typeof document === "undefined") return;
  const original = document.title;
  document.title = flash;
  window.setTimeout(() => {
    if (document.title === flash) document.title = original;
  }, 2500);
}

export function newcomersToast(newcomers: OrderRow[]): string {
  if (newcomers.length === 1) {
    const order = newcomers[0]!;
    return `${notifyToastTitle(notifyKind(order.fulfillment))} ${order.reference}`;
  }
  return `${newcomers.length} new orders`;
}

export async function fetchCatalogOrders(catalogId: string, limit?: number): Promise<OrderRow[]> {
  const supabase = getBrowserSupabase();
  let query = supabase
    .from("orders")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false });
  if (limit != null) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as OrderRow[]).filter((row) => row.catalog_id === catalogId);
}

export async function fetchOrderWithItems(
  catalogId: string,
  orderId: string,
): Promise<{ order: OrderRow | null; items: OrderItemRow[] }> {
  const supabase = getBrowserSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("catalog_id", catalogId)
    .maybeSingle();
  if (!order || (order as OrderRow).catalog_id !== catalogId) {
    return { order: null, items: [] };
  }
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  return { order: order as OrderRow, items: (items ?? []) as OrderItemRow[] };
}

export async function fetchOrderItems(orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  const supabase = getBrowserSupabase();
  const { data } = await supabase.from("order_items").select("*").in("order_id", orderIds);
  return (data ?? []) as OrderItemRow[];
}

export async function fetchOrderEvents(orderIds: string[]): Promise<OrderStatusEventRow[]> {
  if (orderIds.length === 0) return [];
  const supabase = getBrowserSupabase();
  const { data } = await supabase
    .from("order_status_events")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });
  return (data ?? []) as OrderStatusEventRow[];
}

export async function fetchServiceRequests(catalogId: string, limit = 20): Promise<ServiceRequestRow[]> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return ((data ?? []) as ServiceRequestRow[]).filter((row) => row.catalog_id === catalogId);
}

export function asCatalogReservation(value: unknown, catalogId: string): ReservationRow | null {
  const rec = asRecord(value);
  if (!rec) return null;
  if (rec.catalog_id !== catalogId) return null;
  if (typeof rec.id !== "string") return null;
  return rec as unknown as ReservationRow;
}

export async function fetchCatalogReservations(catalogId: string, limit?: number): Promise<ReservationRow[]> {
  const supabase = getBrowserSupabase();
  let query = supabase
    .from("reservations")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false });
  if (limit != null) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ReservationRow[]).filter((row) => row.catalog_id === catalogId);
}

export type CatalogLiveTable = "orders" | "service_requests" | "reservations";

export function useCatalogLiveChannel(
  catalogId: string,
  tables: readonly CatalogLiveTable[],
  onRow: (table: CatalogLiveTable, eventType: string, row: unknown) => void,
): void {
  const onRowRef = useRef(onRow);
  const tablesKey = tables.join(",");

  useEffect(() => {
    onRowRef.current = onRow;
  }, [onRow]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase.channel(`live:${tablesKey}:${catalogId}`);
    for (const table of tablesKey.split(",") as CatalogLiveTable[]) {
      if (table !== "orders" && table !== "service_requests" && table !== "reservations") continue;
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `catalog_id=eq.${catalogId}` },
        (payload) => {
          const next =
            payload.new && Object.keys(payload.new as object).length > 0 ? payload.new : payload.old;
          const cid = rowCatalogId(next);
          if (cid && cid !== catalogId) return;
          onRowRef.current(table, String(payload.eventType), next);
        },
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [catalogId, tablesKey]);
}

/** Immediate fetch on mount + poll + refetch when the tab is shown again. */
export function useLiveRefresh(refresh: () => void, ms = LIVE_POLL_MS): void {
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, ms);
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, ms]);
}
