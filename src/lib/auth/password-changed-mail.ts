import { sendMail } from "@/lib/mail";
import {
  EMAIL_PRODUCT_NAME,
  emailButton,
  emailP,
  escapeHtml,
  renderCatalogEmail,
} from "@/lib/email/catalog-email";

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
  const { html, text } = renderCatalogEmail({
    title: "Your password was changed",
    preheader: "If this wasn’t you, reset it now.",
    text: `Your ${EMAIL_PRODUCT_NAME} password was changed on ${when}.

If you made this change, you can ignore this email.

If you did not change your password, reset it now:
${resetUrl}`,
    bodyHtml: [
      emailP(
        `Your ${EMAIL_PRODUCT_NAME} password was changed on <strong>${escapeHtml(when)}</strong>.`,
      ),
      emailP("If you made this change, you can ignore this email."),
      emailP("If you did not change your password, reset it now."),
      emailButton(resetUrl, "Reset password"),
    ].join(""),
  });

  try {
    await sendMail({ to, subject, text, html });
  } catch (err) {
    console.error("Password-changed email failed", err);
  }
}
