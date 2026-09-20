import "server-only";
import { PRODUCT_URL } from "@/lib/brand";
import {
  emailMuted,
  emailP,
  escapeHtml,
  renderCatalogEmail,
} from "@/lib/email/catalog-email";
import { sendMail } from "@/lib/mail";
import { inquiryNotifyEmails } from "./access";
import type { SetupInquiryFile, SetupInquiryRow } from "@/lib/supabase/types";

function filesList(raw: SetupInquiryRow["files"]): SetupInquiryFile[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is SetupInquiryFile => Boolean(row && typeof row === "object"));
}

export async function notifyNewSetupInquiry(row: SetupInquiryRow): Promise<void> {
  const to = inquiryNotifyEmails()[0];
  if (!to) return;

  const files = filesList(row.files)
    .map((file) => `${file.kind}: ${file.name}`)
    .join("\n");
  const inboxUrl = `${PRODUCT_URL}/admin/inquiries`;

  const text = [
    `New setup inquiry from ${row.business_name}`,
    "",
    `Type: ${row.business_type}`,
    `Country: ${row.country}`,
    `Email: ${row.email || "—"}`,
    `Phone: ${row.phone || "—"}`,
    `WhatsApp: ${row.whatsapp || "—"}`,
    `Website: ${row.website || "—"}`,
    "",
    "Notes",
    row.notes || "—",
    "",
    "Files",
    files || "—",
    "",
    `Inbox: ${inboxUrl}`,
  ].join("\n");

  const notesHtml = row.notes
    ? emailP(
        `<strong>Notes:</strong> <span style="white-space:pre-wrap;">${escapeHtml(row.notes)}</span>`,
      )
    : "";

  const { html, text: wrappedText } = renderCatalogEmail({
    title: "New setup inquiry",
    preheader: `${row.business_name} · ${row.business_type}`,
    text,
    bodyHtml: [
      emailMuted(`${escapeHtml(row.business_name)} · ${escapeHtml(row.business_type)}`),
      emailP(`<strong>Country:</strong> ${escapeHtml(row.country)}`),
      emailP(`<strong>Email:</strong> ${escapeHtml(row.email || "—")}`),
      emailP(`<strong>Phone:</strong> ${escapeHtml(row.phone || "—")}`),
      emailP(`<strong>WhatsApp:</strong> ${escapeHtml(row.whatsapp || "—")}`),
      emailP(`<strong>Website:</strong> ${escapeHtml(row.website || "—")}`),
      notesHtml,
      emailP(`<strong>Files:</strong> ${escapeHtml(files || "None")}`),
      emailMuted(`Open <a href="${escapeHtml(inboxUrl)}" style="color:#5c6370;">${escapeHtml(inboxUrl)}</a>`, true),
    ].join(""),
  });

  try {
    const sent = await sendMail({
      to,
      subject: `Setup inquiry · ${row.business_name}`,
      text: wrappedText,
      html,
    });
    if (!sent) {
      console.warn(`Setup inquiry ${row.id}: email not sent (SMTP not configured).`);
    }
  } catch (error) {
    console.error(`Setup inquiry ${row.id}: failed to send email`, error);
  }
}
