"use server";

import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { sendIssueReport } from "@/lib/support/report-issue";
import { getServerSupabase } from "@/lib/supabase/server";

export type ReportIssueState = { error?: string; sent?: boolean } | null;

export async function reportIssue(
  _prev: ReportIssueState,
  formData: FormData
): Promise<ReportIssueState> {
  const account = await requireAccount();
  const user = await getSessionUser();
  const email = (user?.email ?? "").trim();
  if (!email) return { error: "Sign in again, then send the note." };

  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  const pageUrl = String(formData.get("page_url") ?? "").trim().slice(0, 500);
  const catalogId = String(formData.get("catalog_id") ?? "").trim();
  if (message.length < 8) return { error: "Write a short note about what went wrong." };

  let catalogName = "";
  if (catalogId) {
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from("catalogs")
      .select("id, name, account_id")
      .eq("id", catalogId)
      .maybeSingle();
    if (!data || data.account_id !== account.id) {
      return { error: "Pick one of your catalogs, or leave it blank." };
    }
    catalogName = data.name;
  }

  const result = await sendIssueReport({
    email,
    catalogId,
    catalogName,
    pageUrl,
    message,
  });
  if (!result.ok) return { error: result.error };
  return { sent: true };
}
