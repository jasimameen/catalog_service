import type { ReservationItemSnap, SelectedOption } from "@/lib/supabase/types";

export const RESERVATIONS_ITEMS_SQL_HINT =
  "Run supabase/reservations-items.sql in the Supabase SQL editor, then try again.";

function asName(value: unknown, max = 120): string {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";
}

function asQty(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(99, n) : 0;
}

function asPrice(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

export function parseReservationItems(raw: unknown): ReservationItemSnap[] {
  if (!Array.isArray(raw)) return [];
  const rows: ReservationItemSnap[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const code = asName(obj.code, 64);
    const name = asName(obj.name, 160);
    const qty = asQty(obj.qty);
    if (!code || !name || qty <= 0) continue;
    const options = Array.isArray(obj.options) ? (obj.options as SelectedOption[]) : [];
    const notes = asName(obj.notes, 200);
    rows.push({
      code,
      name,
      qty,
      price: asPrice(obj.price),
      options: options.length > 0 ? options : undefined,
      notes: notes || undefined,
    });
  }
  return rows;
}

export function reservationItemsSummary(items: ReservationItemSnap[]): string {
  if (items.length === 0) return "No food yet";
  const shown = items.slice(0, 3).map((line) => `${line.qty}× ${line.name}`);
  if (items.length > 3) shown.push(`+${items.length - 3} more`);
  return shown.join(" · ");
}

export function reservationItemsTotal(items: ReservationItemSnap[]): number {
  return items.reduce((sum, line) => sum + line.price * line.qty, 0);
}

export function reservationItemsCount(items: ReservationItemSnap[]): number {
  return items.reduce((sum, line) => sum + line.qty, 0);
}

export function formatReserveDay(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return iso;
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  if (iso === todayIso) return "Today";
  if (iso === tomorrowIso) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
