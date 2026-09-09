"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { generateItemCode } from "@/app/admin/_lib/urls";

export type AddItemState = { error?: string } | null;

export async function addItem(
  catalogId: string,
  _prevState: AddItemState,
  formData: FormData,
): Promise<AddItemState> {
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const pack = String(formData.get("pack") ?? "").trim();

  const price = Number(priceRaw);
  if (!name) return { error: "Name is required." };
  if (!priceRaw || Number.isNaN(price) || price < 0) return { error: "Enter a valid price." };

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("catalog_items").insert({
    catalog_id: catalogId,
    code: generateItemCode(),
    name,
    price,
    image,
    category,
    pack,
    description: "",
    visible: true,
    position: 0,
  });

  if (error) return { error: "Could not add the item. Try again." };

  revalidatePath(`/admin/${catalogId}/items`);
  return null;
}

export async function toggleItemVisible(catalogId: string, itemId: string, visible: boolean) {
  const supabase = await getServerSupabase();
  await supabase
    .from("catalog_items")
    .update({ visible })
    .eq("id", itemId)
    .eq("catalog_id", catalogId);

  revalidatePath(`/admin/${catalogId}/items`);
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
  const raw = String(formData.get("bulk") ?? "");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Paste at least one row." };

  const rows = lines
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .map(([name, priceRaw, category, pack, image]) => ({
      name: name ?? "",
      price: Number(priceRaw),
      category: category ?? "",
      pack: pack ?? "",
      image: image ?? "",
    }))
    .filter((row) => row.name && !Number.isNaN(row.price) && row.price >= 0);

  if (rows.length === 0) {
    return { error: "No valid rows found — use \"Name, Price\" per line." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("catalog_items").insert(
    rows.map((row) => ({
      catalog_id: catalogId,
      code: generateItemCode(),
      name: row.name,
      price: row.price,
      category: row.category,
      pack: row.pack,
      image: row.image,
      description: "",
      visible: true,
      position: 0,
    })),
  );

  if (error) return { error: "Could not import items. Try again." };

  revalidatePath(`/admin/${catalogId}/items`);
  return { imported: rows.length };
}
