import {
  CONTACT_EMAIL,
  CONTACT_WHATSAPP_DISPLAY,
  CONTACT_WHATSAPP_HREF,
  PRODUCT_DOMAIN,
  PRODUCT_URL,
} from "@/lib/brand";

/** Wordmark and footer name for transactional mail. Distinct from UI PRODUCT_NAME. */
export const EMAIL_PRODUCT_NAME = "Instant Catalog";

const ACCENT = "#0b5fce";
const INK = "#1d1d1f";
const MUTED = "#5c6370";
const BG = "#f1f4f8";
const SURFACE = "#ffffff";
const BORDER = "#dce2ea";
const CODE_BG = "#eef3fa";

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, Archivo, 'IBM Plex Sans', sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailP(innerHtml: string, last = false): string {
  const margin = last ? "0" : "0 0 16px";
  return `<p style="margin:${margin};font-size:16px;line-height:1.55;color:${INK};">${innerHtml}</p>`;
}

export function emailMuted(innerHtml: string, last = false): string {
  const margin = last ? "0" : "0 0 16px";
  return `<p style="margin:${margin};font-size:14px;line-height:1.55;color:${MUTED};">${innerHtml}</p>`;
}

/** Outlook-safe primary button. One per email. */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
  <tr>
    <td align="center" bgcolor="${ACCENT}" style="background:${ACCENT};border-radius:8px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 24px;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/** Huge letter-spaced 6-digit OTP. Never put a password in mail. */
export function emailOtpCode(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
  <tr>
    <td align="center" bgcolor="${CODE_BG}" style="background:${CODE_BG};border:1px solid ${BORDER};border-radius:8px;padding:20px 12px;">
      <p style="margin:0;font-family:${FONT_STACK};font-size:40px;font-weight:700;letter-spacing:0.32em;line-height:1.2;color:${INK};">${escapeHtml(code)}</p>
    </td>
  </tr>
</table>`;
}

function footerText(): string {
  return `${EMAIL_PRODUCT_NAME} · ${CONTACT_EMAIL} · WhatsApp ${CONTACT_WHATSAPP_DISPLAY} · ${PRODUCT_DOMAIN}`;
}

function footerHtml(): string {
  return `${escapeHtml(EMAIL_PRODUCT_NAME)} · <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(CONTACT_EMAIL)}</a> · <a href="${escapeHtml(CONTACT_WHATSAPP_HREF)}" style="color:${MUTED};text-decoration:underline;">WhatsApp ${escapeHtml(CONTACT_WHATSAPP_DISPLAY)}</a> · <a href="${escapeHtml(PRODUCT_URL)}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(PRODUCT_DOMAIN)}</a>`;
}

export function renderCatalogEmail(options: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  text: string;
}): { html: string; text: string } {
  const title = options.title.trim();
  const preheader = (options.preheader ?? title).trim();
  const bodyText = options.text.trim();
  const text = `${bodyText}\n\n— ${footerText()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background:${BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="${SURFACE}" style="max-width:560px;width:100%;background:${SURFACE};border:1px solid ${BORDER};">
          <tr>
            <td bgcolor="${ACCENT}" style="background:${ACCENT};height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;font-family:${FONT_STACK};font-size:13px;font-weight:700;letter-spacing:0.04em;line-height:1.3;color:${ACCENT};">
              ${escapeHtml(EMAIL_PRODUCT_NAME)}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 8px;font-family:${FONT_STACK};font-size:24px;font-weight:700;line-height:1.25;color:${INK};">
              ${escapeHtml(title)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;font-family:${FONT_STACK};font-size:16px;line-height:1.55;color:${INK};">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid ${BORDER};font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${MUTED};">
              ${footerHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}
