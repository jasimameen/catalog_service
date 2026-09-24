export const RESERVATION_TRACK_SQL_HINT =
  "Run supabase/reservation-track-token.sql in the Supabase SQL editor, then try again.";

export const TRACK_UNLOCK_FAILED = "Could not match that number to this ticket.";

const TRACK_ATTEMPT_LIMIT = 8;
const TRACK_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type Attempt = { n: number; resetAt: number };
const attempts = new Map<string, Attempt>();

export function customerNumberDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function customerNumberMatches(stored: string, entered: string): boolean {
  const a = customerNumberDigits(stored);
  const b = customerNumberDigits(entered);
  if (a && b) {
    if (a === b) return true;
    if (a.length >= 6 && b.length >= 6 && (a.endsWith(b) || b.endsWith(a))) return true;
  }
  const left = stored.trim().toLowerCase();
  const right = entered.trim().toLowerCase();
  return Boolean(left && right && left === right);
}

/** Phone first; table number is the unlock for skip-details dine-in. */
export function ticketUnlockMatches(args: {
  phone?: string | null;
  tableNo?: string | null;
  entered: string;
}): boolean {
  const entered = args.entered.trim();
  if (!entered) return false;
  if (args.phone && customerNumberMatches(args.phone, entered)) return true;
  if (args.tableNo && customerNumberMatches(args.tableNo, entered)) return true;
  return false;
}

export function trackAttemptAllowed(key: string): boolean {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || now > row.resetAt) {
    attempts.set(key, { n: 1, resetAt: now + TRACK_ATTEMPT_WINDOW_MS });
    return true;
  }
  if (row.n >= TRACK_ATTEMPT_LIMIT) return false;
  row.n += 1;
  return true;
}

export function requestTrackKey(ip: string, token: string): string {
  return `${ip.trim() || "unknown"}:${token.trim().toLowerCase()}`;
}

export function requestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || "unknown";
}

export type GuestTrackKind = "order" | "reservation";

export type GuestTrackLine = {
  name: string;
  qty: number;
  total: number;
  options?: string;
};

export type GuestTrackTicket = {
  kind: GuestTrackKind;
  reference: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  items: GuestTrackLine[];
  total: number | null;
  tableNo: string | null;
  fulfillment: string | null;
  day: string | null;
  slot: string | null;
  guests: number | null;
  shopPhone: string;
  shopName: string;
  canCancel: boolean;
  note: string | null;
  unlockHint: string;
};
