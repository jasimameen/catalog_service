"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";

export type SettingsState = { error?: string; saved?: boolean } | null;

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

  // Order emails are sent from catalogs.order_email (see the public order
  // route). Keep every catalog in this account pointed at the address the
  // owner just saved, so Settings is not a no-op.
  const { error: catalogsError } = await supabase
    .from("catalogs")
    .update({ order_email: orderEmail || null })
    .eq("account_id", account.id);

  if (catalogsError) {
    console.error("updateNotifications: catalog email sync failed", catalogsError);
    return { error: "Could not save notifications. Try again." };
  }

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
