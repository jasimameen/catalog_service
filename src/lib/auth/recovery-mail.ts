import { sendMail } from "@/lib/mail";
import { PRODUCT_NAME } from "@/lib/brand";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** One recovery email via app SMTP. Does not call Supabase Auth's own mailer. */
export async function sendRecoveryLinkEmail(options: {
  to: string;
  resetUrl: string;
}): Promise<boolean> {
  const to = options.to.trim();
  if (!to) return false;

  const resetUrl = options.resetUrl;
  const subject = `Reset your ${PRODUCT_NAME} password`;
  const text = `Reset your ${PRODUCT_NAME} password with this link:

${resetUrl}

If you did not ask for this, you can ignore this email.

— ${PRODUCT_NAME}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:560px;">
  <p style="margin:0 0 12px;">Reset your ${escapeHtml(PRODUCT_NAME)} password with this link:</p>
  <p style="margin:0 0 16px;"><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
  <p style="margin:0 0 12px;">If you did not ask for this, you can ignore this email.</p>
  <p style="margin:0;color:#46505e;">— ${escapeHtml(PRODUCT_NAME)}</p>
</div>`;

  return sendMail({ to, subject, text, html });
}
