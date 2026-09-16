"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/types";

const STATUSES = new Set<OrderStatus>(["new", "preparing", "ready", "done", "confirmed", "cancelled"]);

export async function markOrderConfirmed(catalogId: string, orderId: string) {
  return setOrderStatus(catalogId, orderId, "confirmed");
}

export async function setOrderStatus(catalogId: string, orderId: string, status: OrderStatus) {
  if (!STATUSES.has(status)) return;
  const supabase = await getServerSupabase();
  // RLS (`members can update orders`) already scopes this to the signed-in
  // account's own catalogs — the .eq("catalog_id", ...) is defense in depth.
  await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("catalog_id", catalogId);

  revalidatePath(`/admin/${catalogId}/orders`);
  revalidatePath(`/admin/${catalogId}`);
}
