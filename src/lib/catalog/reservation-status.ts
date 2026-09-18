import type { ReservationRow, ReservationStatus } from "@/lib/supabase/types";

export const RESERVATIONS_STATUS_SQL_HINT =
  "Run supabase/reservations-status.sql in the Supabase SQL editor, then try again.";

export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const DEFAULT_RESERVATION_STATUS: ReservationStatus = "pending";

const ACTIVE_LOCK = new Set<ReservationStatus>(["pending", "confirmed", "seated"]);

export const RESERVATION_STATUS_META: Record<
  ReservationStatus,
  { label: string; color: string; timeLabel: string }
> = {
  pending: { label: "Pending", color: "#c27c0e", timeLabel: "Booked at" },
  confirmed: { label: "Confirmed", color: "#0b5fce", timeLabel: "Confirmed at" },
  seated: { label: "Seated", color: "#0f9d58", timeLabel: "Seated at" },
  completed: { label: "Completed", color: "#86868b", timeLabel: "Completed at" },
  cancelled: { label: "Cancelled", color: "#b42318", timeLabel: "Cancelled at" },
  no_show: { label: "No-show", color: "#6941c6", timeLabel: "Marked no-show" },
};

export function parseReservationStatus(value: unknown): ReservationStatus {
  if (value === "confirmed" || value === "seated" || value === "completed" || value === "cancelled" || value === "no_show") {
    return value;
  }
  return "pending";
}

export function reservationStatusLabel(status: unknown): string {
  return RESERVATION_STATUS_META[parseReservationStatus(status)].label;
}

export const RESERVATION_ACTION_LABEL: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirm",
  seated: "Seated",
  completed: "Done",
  cancelled: "Cancel",
  no_show: "No-show",
};

export function reservationActionLabel(status: ReservationStatus): string {
  return RESERVATION_ACTION_LABEL[status];
}

export function reservationLocksTables(status: unknown): boolean {
  return ACTIVE_LOCK.has(parseReservationStatus(status));
}

export function guestCanCancelReservation(status: unknown): boolean {
  return parseReservationStatus(status) === "pending";
}

const MERCHANT_NEXT: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "seated", "cancelled", "no_show"],
  confirmed: ["seated", "completed", "cancelled", "no_show"],
  seated: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function merchantReservationActions(status: unknown): ReservationStatus[] {
  return MERCHANT_NEXT[parseReservationStatus(status)];
}

export function canMerchantSetReservationStatus(from: unknown, to: unknown): boolean {
  const next = parseReservationStatus(to);
  return MERCHANT_NEXT[parseReservationStatus(from)].includes(next);
}

export function reservationStatusTimestamp(
  row: Pick<ReservationRow, "created_at" | "confirmed_at" | "seated_at" | "completed_at" | "cancelled_at" | "no_show_at" | "status">,
  status = parseReservationStatus(row.status),
): string | null {
  const times: Record<ReservationStatus, string | null | undefined> = {
    pending: row.created_at,
    confirmed: row.confirmed_at,
    seated: row.seated_at,
    completed: row.completed_at,
    cancelled: row.cancelled_at,
    no_show: row.no_show_at,
  };
  const value = times[status];
  return typeof value === "string" && value ? value : status === "pending" ? row.created_at : null;
}

export function reservationStatusStampColumn(
  status: ReservationStatus,
): "confirmed_at" | "seated_at" | "completed_at" | "cancelled_at" | "no_show_at" | null {
  if (status === "confirmed") return "confirmed_at";
  if (status === "seated") return "seated_at";
  if (status === "completed") return "completed_at";
  if (status === "cancelled") return "cancelled_at";
  if (status === "no_show") return "no_show_at";
  return null;
}
