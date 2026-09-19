import "server-only";
import { PRODUCT_NAME } from "@/lib/brand";
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
    `Inbox: /admin/inquiries`,
    "",
    `— ${PRODUCT_NAME}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:640px;">
      <h2 style="margin:0 0 8px;">New setup inquiry</h2>
      <p style="margin:0 0 12px;color:#46505e;">${row.business_name} · ${row.business_type}</p>
      <p style="margin:0 0 4px;"><strong>Country:</strong> ${row.country}</p>
      <p style="margin:0 0 4px;"><strong>Email:</strong> ${row.email || "—"}</p>
      <p style="margin:0 0 4px;"><strong>Phone:</strong> ${row.phone || "—"}</p>
      <p style="margin:0 0 4px;"><strong>WhatsApp:</strong> ${row.whatsapp || "—"}</p>
      <p style="margin:0 0 12px;"><strong>Website:</strong> ${row.website || "—"}</p>
      ${row.notes ? `<p style="margin:0 0 12px;white-space:pre-wrap;"><strong>Notes:</strong> ${row.notes}</p>` : ""}
      <p style="margin:0 0 12px;"><strong>Files:</strong> ${files || "None"}</p>
      <p style="margin:0;color:#46505e;">Open <a href="https://catalog.hevyf.com/admin/inquiries">/admin/inquiries</a></p>
    </div>
  `;

  try {
    const sent = await sendMail({
      to,
      subject: `Setup inquiry · ${row.business_name}`,
      text,
      html,
    });
    if (!sent) {
      console.warn(`Setup inquiry ${row.id}: email not sent (SMTP not configured).`);
    }
  } catch (error) {
    console.error(`Setup inquiry ${row.id}: failed to send email`, error);
  }
}
