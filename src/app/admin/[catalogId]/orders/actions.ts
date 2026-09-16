"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCatalogOrNotFound } from "@/app/admin/_lib/data";
import {
  ORDER_STATUSES_SQL_HINT,
  parseDefaultOrderStatus,
  parseOrderStatuses,
  validateStatuses,
  type OrderStatusDef,
} from "@/lib/catalog/order-statuses";
import { newTrackToken, ORDER_HISTORY_SQL_HINT, trackingUrl } from "@/lib/catalog/order-tracking";
import type { OrderStatusEventRow } from "@/lib/supabase/types";

function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || Boolean(error.message?.includes("order_statuses"));
}

function isStatusCheck(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23514" || Boolean(error.message?.includes("orders_status_check"));
}

export async function markOrderConfirmed(catalogId: string, orderId: string) {
  const catalog = await getCatalogOrNotFound(catalogId);
  const statuses = parseOrderStatuses(catalog.order_statuses);
  const done = statuses.find((row) => row.is_done)?.id ?? "done";
  return setOrderStatus(catalogId, orderId, done);
}

export async function setOrderStatus(catalogId: string, orderId: string, status: string) {
  const catalog = await getCatalogOrNotFound(catalogId);
  const statuses = parseOrderStatuses(catalog.order_statuses);
  if (!statuses.some((row) => row.id === status)) return { error: "Unknown status." };

  const supabase = await getServerSupabase();
  const { data: current } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("catalog_id", catalogId)
    .maybeSingle();
  if (!current) return { error: "Order not found." };
  if (current.status === status) return {};

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("catalog_id", catalogId);

  if (isStatusCheck(error) || isMissingColumn(error)) {
    return { error: ORDER_STATUSES_SQL_HINT };
  }
  if (error) return { error: "Could not update status." };

  const { data: eventRow, error: eventError } = await supabase
    .from("order_status_events")
    .insert({
      order_id: orderId,
      from_status: current.status,
      to_status: status,
      actor: "merchant",
    })
    .select("*")
    .single();

  revalidatePath(`/admin/${catalogId}/orders`);
  revalidatePath(`/admin/${catalogId}`);
  if (eventError) return { event: undefined };
  return { event: eventRow as OrderStatusEventRow };
}

export async function ensureTrackLink(
  catalogId: string,
  orderId: string,
): Promise<{ url?: string; error?: string }> {
  const catalog = await getCatalogOrNotFound(catalogId);
  const supabase = await getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("id, track_token")
    .eq("id", orderId)
    .eq("catalog_id", catalogId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };

  let token = order.track_token;
  if (!token) {
    token = newTrackToken();
    const { error } = await supabase
      .from("orders")
      .update({ track_token: token })
      .eq("id", orderId)
      .eq("catalog_id", catalogId);
    if (error) return { error: ORDER_HISTORY_SQL_HINT };
  }

  const { data: domain } = await supabase
    .from("domains")
    .select("hostname, kind")
    .eq("catalog_id", catalogId)
    .eq("status", "verified")
    .order("kind", { ascending: true });
  const custom = (domain ?? []).find((row) => row.kind === "custom");
  return { url: trackingUrl(catalog.slug, token, custom?.hostname ?? null) };
}

export async function saveOrderStatuses(
  catalogId: string,
  incoming: OrderStatusDef[],
  defaultId: string,
): Promise<{ error?: string }> {
  await getCatalogOrNotFound(catalogId);
  const checked = validateStatuses(incoming, defaultId);
  if (!checked.ok) return { error: checked.error };

  const supabase = await getServerSupabase();
  const { data: usedRows } = await supabase
    .from("orders")
    .select("status")
    .eq("catalog_id", catalogId);
  const used = new Set((usedRows ?? []).map((row) => row.status));
  const nextIds = new Set(checked.statuses.map((row) => row.id));
  const blocked = [...used].filter((id) => id && !nextIds.has(id));
  if (blocked.length > 0) {
    return { error: "A status is still used by orders, so it cannot be removed." };
  }

  const { error } = await supabase
    .from("catalogs")
    .update({
      order_statuses: checked.statuses,
      default_order_status: parseDefaultOrderStatus(checked.defaultId, checked.statuses),
    })
    .eq("id", catalogId);

  if (isMissingColumn(error)) return { error: ORDER_STATUSES_SQL_HINT };
  if (error) return { error: "Could not save statuses." };

  revalidatePath(`/admin/${catalogId}/orders`);
  return {};
}
