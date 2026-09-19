import { sendMail } from "@/lib/mail";
import { PRODUCT_NAME } from "@/lib/brand";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function changedAtUtc(): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date())} UTC`;
}

/** Notify after the password is actually updated. Never throws — mail failure must not undo the change. */
export async function notifyPasswordChanged(options: {
  to: string | null | undefined;
  forgotPasswordUrl: string;
}): Promise<void> {
  const to = options.to?.trim() ?? "";
  if (!to) return;

  const when = changedAtUtc();
  const resetUrl = options.forgotPasswordUrl;
  const subject = "Your password was changed";
  const text = `Your ${PRODUCT_NAME} password was changed on ${when}.

If you made this change, you can ignore this email.

If you did not change your password, reset it now:
${resetUrl}

— ${PRODUCT_NAME}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:560px;">
  <p style="margin:0 0 12px;">Your ${escapeHtml(PRODUCT_NAME)} password was changed on <strong>${escapeHtml(when)}</strong>.</p>
  <p style="margin:0 0 12px;">If you made this change, you can ignore this email.</p>
  <p style="margin:0 0 12px;">If you did not change your password, reset it now:</p>
  <p style="margin:0 0 16px;"><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
  <p style="margin:0;color:#46505e;">— ${escapeHtml(PRODUCT_NAME)}</p>
</div>`;

  try {
    await sendMail({ to, subject, text, html });
  } catch (err) {
    console.error("Password-changed email failed", err);
  }
}
