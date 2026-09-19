/**
 * Known throwaway inboxes. Only exact domains / parents — do not block
 * gmail, outlook, yahoo, or ordinary company mail.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "burnermail.io",
  "discarded.me",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getnada.com",
  "grr.la",
  "guerillamail.com",
  "guerrilla.email",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamailblock.com",
  "inboxkitten.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailnesia.com",
  "minuteinbox.com",
  "mohmal.com",
  "sharklasers.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempinbox.com",
  "tempmail.com",
  "tempmailo.com",
  "throwaway.email",
  "tmpmail.net",
  "tmpmail.org",
  "trash-mail.com",
  "trashmail.com",
  "trashmailer.com",
  "yopmail.com",
  "yopmail.fr",
]);

export const DISPOSABLE_EMAIL_ERROR =
  "Use a regular work or personal email. Temporary inboxes aren't accepted.";

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return false;
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (DISPOSABLE_EMAIL_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}
