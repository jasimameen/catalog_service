"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";

export async function markOrderConfirmed(catalogId: string, orderId: string) {
  const supabase = await getServerSupabase();
  // RLS (`members can update orders`) already scopes this to the signed-in
  // account's own catalogs — the .eq("catalog_id", ...) is defense in depth.
  await supabase
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", orderId)
    .eq("catalog_id", catalogId);

  revalidatePath(`/admin/${catalogId}/orders`);
  revalidatePath(`/admin/${catalogId}`);
}
