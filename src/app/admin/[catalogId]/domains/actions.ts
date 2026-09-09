"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { isValidSlug, normalizeSlug } from "@/lib/catalog/slug";

export type SlugState = { error?: string } | null;

export async function updateSlug(
  catalogId: string,
  _prevState: SlugState,
  formData: FormData,
): Promise<SlugState> {
  const raw = String(formData.get("slug") ?? "");
  const slug = normalizeSlug(raw);

  if (!isValidSlug(slug)) {
    return { error: "That address isn't available — use lowercase letters, numbers and hyphens." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("catalogs").update({ slug }).eq("id", catalogId);

  if (error) {
    // Postgres unique_violation
    if (error.code === "23505") {
      return { error: "That address is taken." };
    }
    return { error: "Could not update the address. Try again." };
  }

  revalidatePath(`/admin/${catalogId}/domains`);
  revalidatePath(`/admin/${catalogId}`);
  revalidatePath("/admin");
  return null;
}

export type CustomDomainState = { error?: string } | null;

export async function addCustomDomain(
  catalogId: string,
  _prevState: CustomDomainState,
  formData: FormData,
): Promise<CustomDomainState> {
  const hostname = String(formData.get("hostname") ?? "")
    .trim()
    .toLowerCase();

  if (!hostname || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostname)) {
    return { error: "Enter a valid domain, e.g. catalog.example.com." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("domains").insert({
    catalog_id: catalogId,
    hostname,
    kind: "custom",
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That domain is already in use." };
    }
    return { error: "Could not add the domain. Try again." };
  }

  revalidatePath(`/admin/${catalogId}/domains`);
  return null;
}

export async function removeDomain(catalogId: string, domainId: string) {
  const supabase = await getServerSupabase();
  await supabase.from("domains").delete().eq("id", domainId).eq("catalog_id", catalogId);
  revalidatePath(`/admin/${catalogId}/domains`);
}
