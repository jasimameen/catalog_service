"use server";

import { revalidatePath } from "next/cache";
import { getCatalogAdminClient, getCatalogOrNotFound } from "@/app/admin/_lib/data";
import {
  canMerchantSetReservationStatus,
  parseReservationStatus,
  reservationStatusStampColumn,
  RESERVATIONS_STATUS_SQL_HINT,
} from "@/lib/catalog/reservation-status";
import type { ReservationRow, ReservationStatus } from "@/lib/supabase/types";

export async function setReservationStatus(
  catalogId: string,
  reservationId: string,
  next: ReservationStatus,
): Promise<{ row?: ReservationRow; error?: string }> {
  await getCatalogOrNotFound(catalogId);
  const supabase = await getCatalogAdminClient();
  const { data: current } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .eq("catalog_id", catalogId)
    .maybeSingle();
  if (!current) return { error: "Booking not found." };

  const from = parseReservationStatus(current.status);
  if (from === next) return { row: current as ReservationRow };
  if (!canMerchantSetReservationStatus(from, next)) {
    return { error: "That status change is not allowed." };
  }

  const stamp = reservationStatusStampColumn(next);
  const now = new Date().toISOString();
  const patch: Partial<ReservationRow> = { status: next };
  if (stamp === "confirmed_at") patch.confirmed_at = now;
  if (stamp === "seated_at") patch.seated_at = now;
  if (stamp === "completed_at") patch.completed_at = now;
  if (stamp === "cancelled_at") patch.cancelled_at = now;
  if (stamp === "no_show_at") patch.no_show_at = now;

  const { data: updated, error } = await supabase
    .from("reservations")
    .update(patch)
    .eq("id", reservationId)
    .eq("catalog_id", catalogId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "42703" || error.message.includes("status")) {
      return { error: RESERVATIONS_STATUS_SQL_HINT };
    }
    return { error: "Could not update this booking." };
  }

  await supabase.from("reservation_status_events").insert({
    reservation_id: reservationId,
    from_status: from,
    to_status: next,
    actor: "merchant",
  });

  revalidatePath(`/admin/${catalogId}/orders`);
  revalidatePath(`/admin/${catalogId}`);
  return { row: updated as ReservationRow };
}
