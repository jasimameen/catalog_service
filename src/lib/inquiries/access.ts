import "server-only";
import { CONTACT_EMAIL } from "@/lib/brand";
import { isOperatorEmail } from "@/lib/auth/email-verified";

/** Product inbox. Override or extend with INQUIRY_NOTIFY_EMAIL (comma-separated). */
export const SETUP_INQUIRY_EMAIL = CONTACT_EMAIL;

function envNotifyEmails(): string[] {
  return (process.env.INQUIRY_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function inquiryNotifyEmails(): string[] {
  return [...new Set([SETUP_INQUIRY_EMAIL.toLowerCase(), ...envNotifyEmails()])];
}

export function canManageSetupInquiries(email: string | null | undefined): boolean {
  return isOperatorEmail(email);
}
