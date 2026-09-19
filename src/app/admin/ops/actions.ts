"use server";

import { revalidatePath } from "next/cache";
import { findUserByEmail, isEmailAddress } from "@/lib/auth/find-user";
import { companyNameFromUser, provisionAccount } from "@/lib/auth/provision";
import { requirePlatformOperator } from "@/lib/auth/platform";
import { getServiceClient } from "@/lib/supabase/service";
import type { User } from "@supabase/supabase-js";

async function resolveOrInviteUser(email: string): Promise<{ user: User; invited: boolean } | { error: string }> {
  const existing = await findUserByEmail(email);
  if (existing) return { user: existing, invited: false };

  const service = getServiceClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
    data: { company_name: "My company" },
  });
  if (error || !data.user) {
    console.error("transfer inviteUserByEmail failed", error);
    return {
      error:
        "No Instant Catalog login for that email, and the invite could not be sent. Ask them to sign up, then transfer.",
    };
  }
  return { user: data.user, invited: true };
}

export async function transferCatalog(input: {
  catalogId: string;
  email: string;
  confirm: string;
}): Promise<{ ok: true; invited: boolean; email: string } | { ok: false; error: string }> {
  const gate = await requirePlatformOperator();
  if (!gate.ok) return { ok: false, error: gate.error };

  const email = input.email.trim().toLowerCase();
  if (!isEmailAddress(email)) return { ok: false, error: "Enter a valid email." };

  const service = getServiceClient();
  const { data: catalog, error: catalogError } = await service
    .from("catalogs")
    .select("id, slug, name, account_id")
    .eq("id", input.catalogId)
    .maybeSingle();

  if (catalogError || !catalog) return { ok: false, error: "Catalog not found." };

  const confirm = input.confirm.trim().toLowerCase();
  if (confirm !== catalog.slug && confirm !== "transfer") {
    return { ok: false, error: `Type ${catalog.slug} or “transfer” to confirm.` };
  }

  const resolved = await resolveOrInviteUser(email);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const provisioned = await provisionAccount(
    resolved.user.id,
    companyNameFromUser(resolved.user, catalog.name),
  );
  if (!provisioned) {
    return { ok: false, error: "Could not create or find their company account." };
  }

  const { data: membership } = await service
    .from("account_members")
    .select("account_id")
    .eq("user_id", resolved.user.id)
    .maybeSingle();

  if (!membership) return { ok: false, error: "Could not link their account." };
  if (membership.account_id === catalog.account_id) {
    return { ok: false, error: "That user already owns this catalog." };
  }

  const transferredAt = new Date().toISOString();
  const { error: updateError } = await service
    .from("catalogs")
    .update({ account_id: membership.account_id, transferred_at: transferredAt })
    .eq("id", catalog.id);

  if (updateError) {
    if (updateError.message?.includes("transferred_at") || updateError.code === "PGRST204") {
      const { error: retryError } = await service
        .from("catalogs")
        .update({ account_id: membership.account_id })
        .eq("id", catalog.id);
      if (retryError) {
        console.error("transferCatalog retry failed", retryError);
        return { ok: false, error: "Could not move the catalog. Try again." };
      }
    } else {
      console.error("transferCatalog failed", updateError);
      return { ok: false, error: "Could not move the catalog. Try again." };
    }
  }

  revalidatePath("/admin/ops");
  revalidatePath("/admin");
  revalidatePath(`/admin/${catalog.id}`);
  return { ok: true, invited: resolved.invited, email };
}
