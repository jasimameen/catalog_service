import "server-only";
import { PRODUCT_URL } from "@/lib/brand";
import { emailMuted, emailP, escapeHtml, renderCatalogEmail } from "@/lib/email/catalog-email";
import { inquiryNotifyEmails } from "@/lib/inquiries/access";
import { sendMail } from "@/lib/mail";

export async function sendIssueReport(input: {
  email: string;
  catalogId: string;
  catalogName: string;
  pageUrl: string;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = inquiryNotifyEmails()[0];
  if (!to) {
    return { ok: false, error: "No inbox is configured. Try again later." };
  }

  const text = [
    `Issue report from ${input.email}`,
    "",
    `Email: ${input.email}`,
    `Catalog: ${input.catalogName || "—"} (${input.catalogId || "—"})`,
    `Page: ${input.pageUrl || "—"}`,
    "",
    "Message",
    input.message,
    "",
    `Account: ${PRODUCT_URL}/admin/account`,
  ].join("\n");

  const { html, text: wrappedText } = renderCatalogEmail({
    title: "Issue report",
    preheader: `${input.email} · ${input.catalogName || "no catalog"}`,
    text,
    bodyHtml: [
      emailMuted(escapeHtml(input.email)),
      emailP(`<strong>Catalog:</strong> ${escapeHtml(input.catalogName || "—")} (${escapeHtml(input.catalogId || "—")})`),
      emailP(`<strong>Page:</strong> ${escapeHtml(input.pageUrl || "—")}`),
      emailP(`<strong>Message:</strong> <span style="white-space:pre-wrap;">${escapeHtml(input.message)}</span>`),
    ].join(""),
  });

  const sent = await sendMail({
    to,
    replyTo: input.email,
    subject: `Issue · ${input.email}`,
    text: wrappedText,
    html,
  });

  if (!sent) {
    return { ok: false, error: "Could not send the note. Check that email is configured, then try again." };
  }
  return { ok: true };
}
