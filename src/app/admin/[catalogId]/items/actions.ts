"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth/current-account";
import { getServerSupabase } from "@/lib/supabase/server";
import { generateItemCode } from "@/app/admin/_lib/urls";
import type { CatalogRow } from "@/lib/supabase/types";

export type AddItemState = { error?: string; saved?: boolean } | null;

function revalidateItems(catalogId: string) {
  revalidatePath(`/admin/${catalogId}/items`);
  revalidatePath(`/admin/${catalogId}`);
  revalidatePath("/admin");
}

async function ownedCatalog(catalogId: string) {
  await requireAccount();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("catalogs")
    .select("id")
    .eq("id", catalogId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Pick<CatalogRow, "id">;
}

async function nextPosition(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  catalogId: string,
): Promise<number> {
  const { data } = await supabase
    .from("catalog_items")
    .select("position")
    .eq("catalog_id", catalogId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

function uniqueCodes(count: number): string[] {
  const codes = new Set<string>();
  let guard = 0;
  while (codes.size < count && guard < count + 50) {
    codes.add(generateItemCode());
    guard += 1;
  }
  return Array.from(codes);
}

export async function addItem(
  catalogId: string,
  _prevState: AddItemState,
  formData: FormData,
): Promise<AddItemState> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const priceRaw = String(formData.get("price") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim().slice(0, 80);
  const pack = String(formData.get("pack") ?? "").trim().slice(0, 80);

  const price = Number(priceRaw);
  if (!name) return { error: "Name is required." };
  if (!priceRaw || Number.isNaN(price) || price < 0) return { error: "Enter a valid price." };

  const supabase = await getServerSupabase();
  const position = await nextPosition(supabase, catalogId);
  const rounded = Math.round(price * 100) / 100;

  const { error } = await supabase.from("catalog_items").insert({
    catalog_id: catalogId,
    code: generateItemCode(),
    name,
    price: rounded,
    image,
    category,
    pack,
    description: "",
    visible: true,
    position,
  });

  if (error) {
    console.error("addItem: insert failed", error);
    if (error.code === "23505") {
      const retry = await supabase.from("catalog_items").insert({
        catalog_id: catalogId,
        code: generateItemCode(),
        name,
        price: rounded,
        image,
        category,
        pack,
        description: "",
        visible: true,
        position,
      });
      if (!retry.error) {
        revalidateItems(catalogId);
        return { saved: true };
      }
    }
    return { error: "Could not add the item. Try again." };
  }

  revalidateItems(catalogId);
  return { saved: true };
}

export async function toggleItemVisible(
  catalogId: string,
  itemId: string,
  visible: boolean,
): Promise<{ error?: string }> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("catalog_items")
    .update({ visible })
    .eq("id", itemId)
    .eq("catalog_id", catalogId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("toggleItemVisible: update failed", error);
    return { error: "Could not update visibility. Try again." };
  }

  revalidateItems(catalogId);
  return {};
}

export type PasteImportState = { error?: string; imported?: number } | null;

/**
 * Minimal "paste from spreadsheet" support: one item per line, columns
 * separated by a tab or comma — "Name, Price" or "Name<TAB>Price". Extra
 * columns (category, pack, image) are optional and accepted in that order.
 * Rows that don't parse to a name + a non-negative price are skipped.
 */
export async function pasteImportItems(
  catalogId: string,
  _prevState: PasteImportState,
  formData: FormData,
): Promise<PasteImportState> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const raw = String(formData.get("bulk") ?? "");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Paste at least one row." };

  const rows = lines
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .map(([name, priceRaw, category, pack, image]) => ({
      name: (name ?? "").slice(0, 200),
      price: Number(priceRaw),
      category: (category ?? "").slice(0, 80),
      pack: (pack ?? "").slice(0, 80),
      image: image ?? "",
    }))
    .filter((row) => row.name && !Number.isNaN(row.price) && row.price >= 0);

  if (rows.length === 0) {
    return { error: "No valid rows found — use \"Name, Price\" per line." };
  }

  const supabase = await getServerSupabase();
  const start = await nextPosition(supabase, catalogId);
  const codes = uniqueCodes(rows.length);
  if (codes.length < rows.length) {
    return { error: "Could not import items. Try again." };
  }

  const { error } = await supabase.from("catalog_items").insert(
    rows.map((row, index) => ({
      catalog_id: catalogId,
      code: codes[index]!,
      name: row.name,
      price: Math.round(row.price * 100) / 100,
      category: row.category,
      pack: row.pack,
      image: row.image,
      description: "",
      visible: true,
      position: start + index,
    })),
  );

  if (error) {
    console.error("pasteImportItems: insert failed", error);
    return { error: "Could not import items. Try again." };
  }

  revalidateItems(catalogId);
  return { imported: rows.length };
}
