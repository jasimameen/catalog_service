"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";

export type SettingsState = { error?: string; saved?: boolean } | null;

export async function updateNotifications(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const account = await requireAccount();
  const orderEmail = String(formData.get("order_email") ?? "").trim();
  const orderEmailCc = String(formData.get("order_email_cc") ?? "").trim();

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("accounts")
    .update({
      order_email: orderEmail || null,
      order_email_cc: orderEmailCc || null,
    })
    .eq("id", account.id);

  if (error) return { error: "Could not save notifications. Try again." };

  revalidatePath("/admin/settings");
  return { saved: true };
}

export async function updateCompany(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const account = await requireAccount();
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!name) return { error: "Company name is required." };
  if (!currency) return { error: "Currency is required." };

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("accounts").update({ name, currency }).eq("id", account.id);

  if (error) return { error: "Could not save company details. Try again." };

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { saved: true };
}
