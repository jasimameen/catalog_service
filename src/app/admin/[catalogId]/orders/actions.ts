"use server";

import { revalidatePath } from "next/cache";
import { getCatalogAdminClient, getCatalogOrNotFound } from "@/app/admin/_lib/data";
import {
  ORDER_STATUSES_SQL_HINT,
  isTerminalStatus,
  parseDefaultOrderStatus,
  parseOrderStatuses,
  validateStatuses,
  type OrderStatusDef,
} from "@/lib/catalog/order-statuses";
import { newTrackToken, ORDER_HISTORY_SQL_HINT, trackingUrl } from "@/lib/catalog/order-tracking";
import type { OrderStatusEventRow } from "@/lib/supabase/types";
import { requireAccount } from "@/lib/auth/current-account";
import { ORDER_CLAIMS_SQL_HINT, SERVICE_REQUESTS_SQL_HINT } from "@/lib/catalog/template-settings";

function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || Boolean(error.message?.includes("order_statuses"));
}

function isStatusCheck(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23514" || Boolean(error.message?.includes("orders_status_check"));
}

export async function claimOrder(catalogId: string, orderId: string) {
  const account = await requireAccount();
  await getCatalogOrNotFound(catalogId);
  const supabase = await getCatalogAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      claimed_at: new Date().toISOString(),
      claimed_by: account.name || account.id,
    })
    .eq("id", orderId)
    .eq("catalog_id", catalogId)
    .is("claimed_at", null);
  if (error) {
    if (error.code === "42703" || error.message.includes("claimed")) {
      return { error: ORDER_CLAIMS_SQL_HINT };
    }
    return { error: "Could not take this order." };
  }
  revalidatePath(`/admin/${catalogId}/orders`);
  return { claimed_by: account.name || account.id };
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

  const supabase = await getCatalogAdminClient();
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
  const supabase = await getCatalogAdminClient();
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

export async function resolveServiceRequest(
  catalogId: string,
  requestId: string,
): Promise<{ error?: string }> {
  await getCatalogOrNotFound(catalogId);
  const supabase = await getCatalogAdminClient();
  const { error } = await supabase
    .from("service_requests")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("catalog_id", catalogId);
  if (error) {
    if (error.code === "42703" || error.message.includes("resolved_at")) {
      return { error: SERVICE_REQUESTS_SQL_HINT };
    }
    return { error: "Could not mark this as taken." };
  }
  revalidatePath(`/admin/${catalogId}/orders`);
  revalidatePath(`/admin/${catalogId}/floor`);
  revalidatePath(`/admin/${catalogId}`);
  return {};
}

/** Marks leftover open tickets from before `beforeIso` as done. Keeps history. */
export async function clearPriorDayOrders(
  catalogId: string,
  beforeIso: string,
): Promise<{ error?: string; cleared?: number }> {
  const catalog = await getCatalogOrNotFound(catalogId);
  const before = new Date(beforeIso);
  if (!Number.isFinite(before.getTime())) return { error: "Invalid time." };
  if (before.getTime() > Date.now() + 60_000) return { error: "Cannot clear future tickets." };

  const statuses = parseOrderStatuses(catalog.order_statuses);
  const done = statuses.find((row) => row.is_done)?.id ?? "done";
  const supabase = await getCatalogAdminClient();
  const { data: rows, error: loadError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("catalog_id", catalogId)
    .lt("created_at", before.toISOString());
  if (loadError) return { error: "Could not load leftover tickets." };

  const leftover = (rows ?? []).filter((row) => !isTerminalStatus(row.status, statuses) && row.status !== done);
  for (const row of leftover) {
    const { error } = await supabase
      .from("orders")
      .update({ status: done })
      .eq("id", row.id)
      .eq("catalog_id", catalogId);
    if (isStatusCheck(error) || isMissingColumn(error)) return { error: ORDER_STATUSES_SQL_HINT };
    if (error) return { error: "Could not clear leftover tickets." };
    await supabase.from("order_status_events").insert({
      order_id: row.id,
      from_status: row.status,
      to_status: done,
      actor: "merchant",
    });
  }

  const { error: requestError } = await supabase
    .from("service_requests")
    .update({ resolved_at: new Date().toISOString() })
    .eq("catalog_id", catalogId)
    .is("resolved_at", null)
    .lt("created_at", before.toISOString());
  if (requestError && requestError.code !== "42703" && !requestError.message.includes("resolved_at")) {
    return { error: "Orders cleared. Table calls could not be dismissed." };
  }

  revalidatePath(`/admin/${catalogId}/orders`);
  revalidatePath(`/admin/${catalogId}`);
  return { cleared: leftover.length };
}

export async function saveOrderStatuses(
  catalogId: string,
  incoming: OrderStatusDef[],
  defaultId: string,
): Promise<{ error?: string }> {
  await getCatalogOrNotFound(catalogId);
  const checked = validateStatuses(incoming, defaultId);
  if (!checked.ok) return { error: checked.error };

  const supabase = await getCatalogAdminClient();
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
