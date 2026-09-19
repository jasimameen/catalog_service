import { sendMail } from "@/lib/mail";
import { PRODUCT_NAME } from "@/lib/brand";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 6-digit sign-up code via app SMTP. Does not call Supabase Auth's mailer. */
export async function sendEmailOtpMail(options: { to: string; code: string }): Promise<boolean> {
  const to = options.to.trim();
  if (!to) return false;

  const code = options.code;
  const subject = `Your ${PRODUCT_NAME} code is ${code}`;
  const text = `Your ${PRODUCT_NAME} confirmation code is ${code}.

It expires in 10 minutes. Dummy or temporary inboxes will not receive this.

If you did not ask for this, you can ignore this email.

— ${PRODUCT_NAME}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:560px;">
  <p style="margin:0 0 12px;">Your ${escapeHtml(PRODUCT_NAME)} confirmation code is:</p>
  <p style="margin:0 0 16px;font-size:28px;letter-spacing:0.18em;font-weight:700;">${escapeHtml(code)}</p>
  <p style="margin:0 0 12px;">It expires in 10 minutes. Dummy or temporary inboxes will not receive this.</p>
  <p style="margin:0 0 12px;">If you did not ask for this, you can ignore this email.</p>
  <p style="margin:0;color:#46505e;">— ${escapeHtml(PRODUCT_NAME)}</p>
</div>`;

  return sendMail({ to, subject, text, html });
}
