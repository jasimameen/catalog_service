import { sendMail } from "@/lib/mail";
import {
  EMAIL_PRODUCT_NAME,
  emailMuted,
  emailOtpCode,
  emailP,
  renderCatalogEmail,
} from "@/lib/email/catalog-email";

/** 6-digit sign-up code via app SMTP. Does not call Supabase Auth's mailer. */
export async function sendEmailOtpMail(options: { to: string; code: string }): Promise<boolean> {
  const to = options.to.trim();
  if (!to) return false;

  const code = options.code;
  const subject = `Your ${EMAIL_PRODUCT_NAME} code is ${code}`;
  const { html, text } = renderCatalogEmail({
    title: "Your confirmation code",
    preheader: `${code} — expires in 10 minutes.`,
    text: `Your ${EMAIL_PRODUCT_NAME} confirmation code is ${code}.

It expires in 10 minutes.

Didn’t ask? Ignore this email.`,
    bodyHtml: [
      emailP(`Use this ${EMAIL_PRODUCT_NAME} code to confirm your email.`),
      emailOtpCode(code),
      emailP("It expires in 10 minutes."),
      emailMuted("Didn’t ask? Ignore this email.", true),
    ].join(""),
  });

  return sendMail({ to, subject, text, html });
}
