import { sendMail } from "@/lib/mail";
import { PRODUCT_NAME } from "@/lib/brand";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendWelcomeEmail(to: string, companyName: string): Promise<void> {
  const company = companyName.trim() || "your company";
  const subject = `Welcome to ${PRODUCT_NAME}`;
  const text = `Welcome to ${PRODUCT_NAME}.

Your account for ${company} is ready. Sign in and start a catalog.

— ${PRODUCT_NAME}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:560px;">
  <p style="margin:0 0 12px;">Welcome to ${escapeHtml(PRODUCT_NAME)}.</p>
  <p style="margin:0 0 12px;">Your account for <strong>${escapeHtml(company)}</strong> is ready. Sign in and start a catalog.</p>
  <p style="margin:0;color:#46505e;">— ${escapeHtml(PRODUCT_NAME)}</p>
</div>`;

  try {
    await sendMail({ to, subject, text, html });
  } catch (err) {
    console.error("Welcome email failed", err);
  }
}
