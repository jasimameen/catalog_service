import type { SetupInquiryDayHours, SetupInquiryHours } from "@/lib/supabase/types";

export const WEEK_DAYS: { id: SetupInquiryDayHours["day"]; label: string }[] = [
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
  { id: "sun", label: "Sunday" },
];

export function defaultInquiryHours(): SetupInquiryHours {
  return {
    days: WEEK_DAYS.map((day) => {
      if (day.id === "mon") return { day: day.id, closed: true, open: "11:00", close: "22:00" };
      if (day.id === "sun") return { day: day.id, closed: false, open: "11:00", close: "21:00" };
      if (day.id === "fri" || day.id === "sat") {
        return { day: day.id, closed: false, open: "11:00", close: "23:00" };
      }
      return { day: day.id, closed: false, open: "11:00", close: "22:00" };
    }),
    notes: "",
  };
}

function asDay(value: unknown): SetupInquiryDayHours["day"] | null {
  return WEEK_DAYS.some((d) => d.id === value) ? (value as SetupInquiryDayHours["day"]) : null;
}

function asTime(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  return /^\d{1,2}:\d{2}$/.test(t) ? t : fallback;
}

export function parseInquiryHours(raw: unknown): SetupInquiryHours {
  const fallback = defaultInquiryHours();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const obj = raw as Record<string, unknown>;
  const notes = typeof obj.notes === "string" ? obj.notes.trim().slice(0, 400) : "";
  const rows = Array.isArray(obj.days) ? obj.days : [];
  const byDay = new Map<SetupInquiryDayHours["day"], SetupInquiryDayHours>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const item = row as Record<string, unknown>;
    const day = asDay(item.day);
    if (!day) continue;
    byDay.set(day, {
      day,
      closed: Boolean(item.closed),
      open: asTime(item.open, "11:00"),
      close: asTime(item.close, "22:00"),
    });
  }
  return {
    days: fallback.days.map((day) => byDay.get(day.day) ?? day),
    notes,
  };
}

export function formatInquiryHours(hours: SetupInquiryHours): string {
  const lines = hours.days.map((day) => {
    const label = WEEK_DAYS.find((d) => d.id === day.day)?.label ?? day.day;
    if (day.closed) return `${label}: closed`;
    return `${label}: ${day.open}–${day.close}`;
  });
  if (hours.notes) lines.push(hours.notes);
  return lines.join("\n");
}
