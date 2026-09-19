import { CONTACT_EMAIL } from "@/lib/brand";

function inquiryNotifyEmails(): string[] {
  const extra = (process.env.INQUIRY_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([CONTACT_EMAIL.toLowerCase(), ...extra])];
}

/** Same operator set as the setup inbox — safe to import from proxy. */
export function isOperatorEmail(email: string | null | undefined): boolean {
  const next = (email ?? "").trim().toLowerCase();
  if (!next) return false;
  if (next.endsWith("@hevyf.com")) return true;
  if (inquiryNotifyEmails().includes(next)) return true;
  if (next === "jasimameen.official@gmail.com") return true;
  return false;
}

export function sessionNeedsEmailOtp(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
} | null): boolean {
  if (!user) return false;
  if (isOperatorEmail(user.email)) return false;
  return !user.email_confirmed_at;
}

export function verifyEmailPath(email?: string | null, next?: string | null): string {
  const params = new URLSearchParams();
  const trimmed = (email ?? "").trim();
  if (trimmed) params.set("email", trimmed);
  if (next && next.startsWith("/") && !next.startsWith("//")) params.set("next", next);
  const query = params.toString();
  return query ? `/auth/verify?${query}` : "/auth/verify";
}
