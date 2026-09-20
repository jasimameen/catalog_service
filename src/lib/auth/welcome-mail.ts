import { sendMail } from "@/lib/mail";
import { PRODUCT_URL } from "@/lib/brand";
import {
  EMAIL_PRODUCT_NAME,
  emailButton,
  emailP,
  escapeHtml,
  renderCatalogEmail,
} from "@/lib/email/catalog-email";

export async function sendWelcomeEmail(to: string, companyName: string): Promise<void> {
  const company = companyName.trim() || "your company";
  const signInUrl = `${PRODUCT_URL}/auth/sign-in`;
  const subject = `Welcome to ${EMAIL_PRODUCT_NAME}`;
  const { html, text } = renderCatalogEmail({
    title: `Welcome to ${EMAIL_PRODUCT_NAME}`,
    preheader: `Your account for ${company} is ready.`,
    text: `Welcome to ${EMAIL_PRODUCT_NAME}.

Your account for ${company} is ready. Sign in and start a catalog.

${signInUrl}`,
    bodyHtml: [
      emailP(
        `Your account for <strong>${escapeHtml(company)}</strong> is ready. Sign in and start a catalog.`,
      ),
      emailButton(signInUrl, "Sign in"),
    ].join(""),
  });

  try {
    await sendMail({ to, subject, text, html });
  } catch (err) {
    console.error("Welcome email failed", err);
  }
}
