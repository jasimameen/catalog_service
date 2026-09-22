export type WeekDayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type CatalogDayHours = {
  day: WeekDayId;
  closed: boolean;
  open: string;
  close: string;
};

export type CatalogHours = {
  days: CatalogDayHours[];
  notes: string;
};

export const WEEK_DAYS: { id: WeekDayId; label: string; short: string }[] = [
  { id: "mon", label: "Monday", short: "Mon" },
  { id: "tue", label: "Tuesday", short: "Tue" },
  { id: "wed", label: "Wednesday", short: "Wed" },
  { id: "thu", label: "Thursday", short: "Thu" },
  { id: "fri", label: "Friday", short: "Fri" },
  { id: "sat", label: "Saturday", short: "Sat" },
  { id: "sun", label: "Sunday", short: "Sun" },
];

const DAY_ALIASES: Record<string, WeekDayId> = {
  monday: "mon",
  mon: "mon",
  tuesday: "tue",
  tue: "tue",
  tues: "tue",
  wednesday: "wed",
  wed: "wed",
  thursday: "thu",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  friday: "fri",
  fri: "fri",
  saturday: "sat",
  sat: "sat",
  sunday: "sun",
  sun: "sun",
};

const RANGE_SPLIT = /\s*(?:–|—|−|-|to|thru|through)\s*/i;
const TIME_TOKEN = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i;

export function defaultCatalogHours(): CatalogHours {
  return {
    days: WEEK_DAYS.map((day) => {
      if (day.id === "mon") return { day: day.id, closed: true, open: "11:00", close: "22:00" };
      if (day.id === "fri" || day.id === "sat") {
        return { day: day.id, closed: false, open: "11:00", close: "23:00" };
      }
      if (day.id === "sun") return { day: day.id, closed: false, open: "11:00", close: "21:00" };
      return { day: day.id, closed: false, open: "11:00", close: "22:00" };
    }),
    notes: "",
  };
}

export function normalizeClock(value: string, fallback = "11:00"): string {
  const parsed = parseClock(value);
  return parsed ?? fallback;
}

export function parseCatalogHours(raw: string): CatalogHours {
  const fallback = defaultCatalogHours();
  const text = raw.trim();
  if (!text) return fallback;

  const json = tryParseHoursJson(text);
  if (json) return json;

  const byDay = new Map<WeekDayId, CatalogDayHours>();
  const leftover: string[] = [];
  let pending: WeekDayId[] | null = null;

  for (const original of text.split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;

    const combined = parseDaysAndHours(line);
    if (combined) {
      applyDays(byDay, combined.days, combined.closed, combined.open, combined.close);
      pending = null;
      continue;
    }

    const onlyDays = parseDayRangeOnly(line);
    if (onlyDays) {
      pending = onlyDays;
      continue;
    }

    if (pending) {
      if (isClosedPhrase(line)) {
        applyDays(byDay, pending, true, "11:00", "22:00");
        pending = null;
        continue;
      }
      const times = parseTimeRange(line);
      if (times) {
        applyDays(byDay, pending, false, times.open, times.close);
        pending = null;
        continue;
      }
    }

    leftover.push(original.trim());
  }

  if (byDay.size === 0) {
    return { ...fallback, notes: text.slice(0, 400) };
  }

  return {
    days: fallback.days.map((day) => byDay.get(day.day) ?? day),
    notes: leftover.join("\n").slice(0, 400),
  };
}

export function parseHoursState(raw: unknown): CatalogHours {
  const json = tryParseHoursJson(raw);
  return json ?? defaultCatalogHours();
}

export function formatCatalogHours(hours: CatalogHours): string {
  const groups: { start: number; end: number; label: string }[] = [];
  hours.days.forEach((day, index) => {
    const label = day.closed
      ? "closed"
      : `${normalizeClock(day.open)}–${normalizeClock(day.close, "22:00")}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label && last.end === index - 1) {
      last.end = index;
      return;
    }
    groups.push({ start: index, end: index, label });
  });

  const lines = groups.map((group) => {
    const start = WEEK_DAYS[group.start]!;
    const end = WEEK_DAYS[group.end]!;
    const name = group.start === group.end ? start.label : `${start.short}–${end.short}`;
    return group.label === "closed" ? `${name} closed` : `${name} ${group.label}`;
  });
  const notes = hours.notes.trim();
  if (notes) lines.push(notes);
  return lines.join("\n").slice(0, 800);
}

function tryParseHoursJson(raw: unknown): CatalogHours | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const rows = Array.isArray(obj.days) ? obj.days : [];
  if (rows.length === 0) return null;
  const fallback = defaultCatalogHours();
  const byDay = new Map<WeekDayId, CatalogDayHours>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const item = row as Record<string, unknown>;
    const day = asDay(item.day);
    if (!day) continue;
    byDay.set(day, {
      day,
      closed: Boolean(item.closed),
      open: normalizeClock(typeof item.open === "string" ? item.open : "", "11:00"),
      close: normalizeClock(typeof item.close === "string" ? item.close : "", "22:00"),
    });
  }
  if (byDay.size === 0) return null;
  return {
    days: fallback.days.map((day) => byDay.get(day.day) ?? day),
    notes: typeof obj.notes === "string" ? obj.notes.trim().slice(0, 400) : "",
  };
}

function applyDays(
  byDay: Map<WeekDayId, CatalogDayHours>,
  days: WeekDayId[],
  closed: boolean,
  open: string,
  close: string,
) {
  for (const day of days) {
    byDay.set(day, { day, closed, open, close });
  }
}

function parseDaysAndHours(line: string): {
  days: WeekDayId[];
  closed: boolean;
  open: string;
  close: string;
} | null {
  const cleaned = line.replace(/[·•|,]/g, " ").replace(/\s+/g, " ").trim();
  const closedMatch = cleaned.match(
    /^(.+?)\s*:?\s*(closed|close|off)$/i,
  );
  if (closedMatch) {
    const days = parseDayRangeOnly(closedMatch[1] ?? "");
    if (days) return { days, closed: true, open: "11:00", close: "22:00" };
  }

  const timed = cleaned.match(/^(.+?)\s*:?\s+(\d[\d:\s.].+)$/);
  if (timed) {
    const days = parseDayRangeOnly(timed[1] ?? "");
    const times = parseTimeRange(timed[2] ?? "");
    if (days && times) return { days, closed: false, open: times.open, close: times.close };
  }
  return null;
}

function parseDayRangeOnly(line: string): WeekDayId[] | null {
  const cleaned = line
    .replace(/[:.]/g, "")
    .replace(/\b(hours?|open|from)\b/gi, "")
    .trim();
  if (!cleaned || /\d/.test(cleaned)) return null;
  const parts = cleaned.split(RANGE_SPLIT).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return null;
  const start = asDay(parts[0]);
  if (!start) return null;
  if (parts.length === 1) return [start];
  const end = asDay(parts[1]);
  if (!end) return null;
  return daysBetween(start, end);
}

function parseTimeRange(line: string): { open: string; close: string } | null {
  if (isClosedPhrase(line)) return null;
  const matches = [...line.matchAll(new RegExp(TIME_TOKEN, "gi"))];
  if (matches.length < 2) return null;
  const open = clockFromMatch(matches[0]!);
  const close = clockFromMatch(matches[1]!);
  if (!open || !close) return null;
  return { open, close };
}

function clockFromMatch(match: RegExpMatchArray): string | null {
  const hourRaw = Number(match[1]);
  const minute = match[2] != null ? Number(match[2]) : 0;
  if (!Number.isFinite(hourRaw) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59) return null;
  let hour = hourRaw;
  const mer = (match[3] ?? "").replace(/\./g, "").toLowerCase();
  if (mer === "am" || mer === "pm") {
    hour = hour % 12;
    if (mer === "pm") hour += 12;
  } else if (hour > 23) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseClock(value: string): string | null {
  const match = value.trim().match(TIME_TOKEN);
  if (!match) return null;
  return clockFromMatch(match);
}

function isClosedPhrase(line: string): boolean {
  return /^(closed|close|off)$/i.test(line.trim());
}

function asDay(value: unknown): WeekDayId | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return DAY_ALIASES[key] ?? null;
}

function daysBetween(start: WeekDayId, end: WeekDayId): WeekDayId[] {
  const ids = WEEK_DAYS.map((day) => day.id);
  const from = ids.indexOf(start);
  const to = ids.indexOf(end);
  if (from < 0 || to < 0) return [start];
  if (from <= to) return ids.slice(from, to + 1);
  return [...ids.slice(from), ...ids.slice(0, to + 1)];
}
