"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireAccount } from "@/lib/auth/current-account";
import { canManageSetupInquiries } from "@/lib/inquiries/access";
import { getServiceClient } from "@/lib/supabase/service";
import type { SetupInquiryStatus } from "@/lib/supabase/types";

const STATUSES = new Set<SetupInquiryStatus>(["new", "in_progress", "live", "closed"]);

async function requireInbox() {
  await requireAccount({ next: "/admin/inquiries" });
  const user = await getSessionUser();
  if (!canManageSetupInquiries(user?.email)) {
    return { ok: false as const, error: "This inbox is only for Instant Catalog setup." };
  }
  return { ok: true as const };
}

export async function updateInquiryStatus(id: string, status: SetupInquiryStatus) {
  const gate = await requireInbox();
  if (!gate.ok) return gate;
  if (!STATUSES.has(status)) return { ok: false as const, error: "Unknown status." };

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("setup_inquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("updateInquiryStatus failed", error);
    return { ok: false as const, error: "Could not update status." };
  }
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function signedInquiryFileUrl(path: string): Promise<string | null> {
  const gate = await requireInbox();
  if (!gate.ok) return null;
  const clean = path.replace(/^\/+/, "");
  if (!clean || clean.includes("..")) return null;
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from("setup-inquiries").createSignedUrl(clean, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
