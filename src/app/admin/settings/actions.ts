"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { getLastMailError, isMailConfigured, sendMail } from "@/lib/mail";
import {
  EMAIL_PRODUCT_NAME,
  emailP,
  renderCatalogEmail,
} from "@/lib/email/catalog-email";
import { getServerSupabase } from "@/lib/supabase/server";

export type SettingsState = { error?: string; saved?: boolean; message?: string } | null;

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updateNotifications(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const account = await requireAccount();
  const orderEmail = String(formData.get("order_email") ?? "").trim();
  const orderEmailCc = String(formData.get("order_email_cc") ?? "").trim();

  if (orderEmail && !isEmail(orderEmail)) return { error: "Enter a valid order email." };
  if (orderEmailCc && !isEmail(orderEmailCc)) return { error: "Enter a valid copy-to email." };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("accounts")
    .update({
      order_email: orderEmail || null,
      order_email_cc: orderEmailCc || null,
    })
    .eq("id", account.id);

  if (error) return { error: "Could not save notifications. Try again." };

  revalidatePath("/admin", "layout");
  return { saved: true };
}

export async function updateCompany(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const account = await requireAccount();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!name) return { error: "Company name is required." };
  if (!/^[A-Z]{3,6}$/.test(currency)) {
    return { error: "Use a short currency code, e.g. QAR or USD." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("accounts").update({ name, currency }).eq("id", account.id);

  if (error) return { error: "Could not save company details. Try again." };

  // Prices on the dashboard and items list use catalogs.currency, copied
  // from the account at publish time. Sync so a Settings save is visible.
  const { error: catalogsError } = await supabase
    .from("catalogs")
    .update({ currency })
    .eq("account_id", account.id);

  if (catalogsError) {
    console.error("updateCompany: catalog currency sync failed", catalogsError);
    return { error: "Could not save company details. Try again." };
  }

  revalidatePath("/admin", "layout");
  return { saved: true };
}

export async function sendTestMail(
  _prevState: SettingsState,
  _formData: FormData,
): Promise<SettingsState> {
  await requireAccount();
  const user = await getSessionUser();
  const to = user?.email?.trim() ?? "";
  if (!to) return { error: "Sign in again to send a test email." };
  if (!isMailConfigured()) {
    return { error: "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on this server." };
  }

  const { html, text } = renderCatalogEmail({
    title: "Test email",
    preheader: "Outgoing email is working.",
    text: `This is a test from ${EMAIL_PRODUCT_NAME}. If you received it, outgoing email is working.`,
    bodyHtml: emailP(
      `This is a test from ${EMAIL_PRODUCT_NAME}. If you received it, outgoing email is working.`,
      true,
    ),
  });

  const sent = await sendMail({
    to,
    subject: `${EMAIL_PRODUCT_NAME} test email`,
    text,
    html,
  });
  if (!sent) {
    return { error: getLastMailError() || "Could not send the test email." };
  }
  return { saved: true, message: `Sent a test email to ${to}.` };
}
