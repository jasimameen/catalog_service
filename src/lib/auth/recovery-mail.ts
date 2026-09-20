import { sendMail } from "@/lib/mail";
import {
  EMAIL_PRODUCT_NAME,
  emailButton,
  emailMuted,
  emailP,
  renderCatalogEmail,
} from "@/lib/email/catalog-email";

/** One recovery email via app SMTP. Does not call Supabase Auth's own mailer. */
export async function sendRecoveryLinkEmail(options: {
  to: string;
  resetUrl: string;
}): Promise<boolean> {
  const to = options.to.trim();
  if (!to) return false;

  const resetUrl = options.resetUrl;
  const subject = `Reset your ${EMAIL_PRODUCT_NAME} password`;
  const { html, text } = renderCatalogEmail({
    title: "Reset your password",
    preheader: "Use this link to choose a new password.",
    text: `Reset your ${EMAIL_PRODUCT_NAME} password with this link:

${resetUrl}

Didn’t ask? Ignore this email.`,
    bodyHtml: [
      emailP(`Use the button below to choose a new ${EMAIL_PRODUCT_NAME} password.`),
      emailButton(resetUrl, "Reset password"),
      emailMuted("Didn’t ask? Ignore this email.", true),
    ].join(""),
  });

  return sendMail({ to, subject, text, html });
}
