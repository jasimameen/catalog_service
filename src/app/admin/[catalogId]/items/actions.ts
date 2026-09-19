"use server";

import { revalidatePath } from "next/cache";
import { revalidateStorefrontCatalog } from "@/lib/catalog/storefront-cache";
import { requireAccount } from "@/lib/auth/current-account";
import { getCatalogAdminClient } from "@/app/admin/_lib/data";
import { getServiceClient } from "@/lib/supabase/service";
import { generateItemCode } from "@/app/admin/_lib/urls";
import type { CatalogItemRow, CatalogRow, ItemOptionGroup } from "@/lib/supabase/types";
import { fillAutoCodesAndGroups, foldVariantRows, type MappedImportRow } from "@/lib/catalog/import-map";
import { parseOptionsFromForm } from "@/lib/catalog/item-options";
import { MERCHANDISING_SQL_HINT, parseItemImageFit } from "@/lib/catalog/merchandising";
import {
  COMBOS_SQL_HINT,
  formatComboIncludes,
  parseComboLines,
  resolveComboIncludes,
  type ComboLine,
} from "@/lib/catalog/combos";
import { pickPlaceholder, STOCK_PHOTOS } from "@/lib/catalog/placeholders";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function photoExt(file: File): string | null {
  if (file.type && PHOTO_EXT[file.type]) return PHOTO_EXT[file.type]!;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpeg") || name.endsWith(".jpg")) return "jpg";
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".gif")) return "gif";
  return null;
}

async function uploadItemPhoto(
  catalogId: string,
  file: File,
): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_PHOTO_BYTES) return { error: "Photo must be 4MB or smaller." };
  const ext = photoExt(file);
  if (!ext) return { error: "Use a JPEG, PNG, WebP, or GIF photo." };

  const path = `${catalogId}/${crypto.randomUUID()}.${ext}`;
  const service = getServiceClient();
  const { error } = await service.storage.from("catalog-images").upload(path, file, {
    contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
    upsert: false,
  });

  if (error) {
    console.error("uploadItemPhoto: upload failed", error);
    return { error: "Could not upload the photo. Try again." };
  }

  const { data } = service.storage.from("catalog-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

export type AddItemState = { error?: string; saved?: boolean } | null;

function revalidateItems(catalogId: string) {
  revalidatePath(`/admin/${catalogId}/items`);
  revalidatePath(`/admin/${catalogId}`);
  revalidatePath("/admin");
  revalidateStorefrontCatalog();
}

async function ownedCatalog(catalogId: string) {
  await requireAccount();
  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalogs")
    .select("id")
    .eq("id", catalogId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Pick<CatalogRow, "id">;
}

async function nextPosition(
  supabase: Awaited<ReturnType<typeof getCatalogAdminClient>>,
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
  const photo = formData.get("photo");
  let image = String(formData.get("image") ?? "").trim();
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadItemPhoto(catalogId, photo);
    if (uploaded.error || !uploaded.url) return { error: uploaded.error ?? "Could not upload the photo." };
    image = uploaded.url;
  }
  const category = String(formData.get("category") ?? "").trim().slice(0, 80);
  const pack = String(formData.get("pack") ?? "").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const barcodeRaw = String(formData.get("barcode") ?? "").trim().slice(0, 64);
  const barcode = barcodeRaw || null;

  const price = Number(priceRaw);
  if (!name) return { error: "Name is required." };
  if (!priceRaw || Number.isNaN(price) || price < 0) return { error: "Enter a valid price." };

  const supabase = await getCatalogAdminClient();
  const position = await nextPosition(supabase, catalogId);
  const rounded = Math.round(price * 100) / 100;

  const options = parseOptionsFromForm(formData.get("options"));
  const featured = formData.get("featured") === "1";
  const imageFit = parseItemImageFit(formData.get("imageFit"));

  const { error } = await supabase.from("catalog_items").insert({
    catalog_id: catalogId,
    code: generateItemCode(),
    name,
    price: rounded,
    image,
    category,
    pack,
    description,
    barcode,
    options,
    featured,
    image_fit: imageFit,
    visible: true,
    position,
  });

    if (error) {
    console.error("addItem: insert failed", error);
    if (error.message?.includes("featured") || error.message?.includes("image_fit")) {
      return { error: MERCHANDISING_SQL_HINT };
    }
    if (error.code === "42703" || error.message?.includes("options")) {
      return { error: "Run supabase/restaurant.sql in the Supabase SQL editor, then try again." };
    }
    if (error.code === "23505") {
      const retry = await supabase.from("catalog_items").insert({
        catalog_id: catalogId,
        code: generateItemCode(),
        name,
        price: rounded,
        image,
        category,
        pack,
        description,
        barcode,
        options,
        featured,
        image_fit: imageFit,
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

function isMissingComboColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    Boolean(error.message?.includes("is_combo")) ||
    Boolean(error.message?.includes("combo_lines"))
  );
}

export async function addCombo(
  catalogId: string,
  nameRaw: string,
  priceRaw: string,
  comboLines: ComboLine[],
): Promise<{ error?: string; saved?: boolean }> {
  return writeCombo(catalogId, null, nameRaw, priceRaw, comboLines);
}

export async function updateCombo(
  catalogId: string,
  itemId: string,
  nameRaw: string,
  priceRaw: string,
  comboLines: ComboLine[],
): Promise<{ error?: string; saved?: boolean }> {
  return writeCombo(catalogId, itemId, nameRaw, priceRaw, comboLines);
}

async function writeCombo(
  catalogId: string,
  itemId: string | null,
  nameRaw: string,
  priceRaw: string,
  comboLines: ComboLine[],
): Promise<{ error?: string; saved?: boolean }> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const name = nameRaw.trim().slice(0, 200);
  const price = Number(priceRaw);
  const lines = parseComboLines(comboLines);
  if (!name) return { error: "Name is required." };
  if (!priceRaw.trim() || Number.isNaN(price) || price < 0) return { error: "Enter a valid price." };
  if (lines.length === 0) return { error: "Pick at least one product." };

  const supabase = await getCatalogAdminClient();
  const { data: productRows } = await supabase
    .from("catalog_items")
    .select("id, code, name, image, is_combo")
    .eq("catalog_id", catalogId);
  const products = ((productRows ?? []) as CatalogItemRow[]).filter((row) => row.id !== itemId);
  const resolved = resolveComboIncludes(lines, products);
  if (resolved.length === 0) return { error: "Pick at least one product." };
  const cleanLines = resolved.map((row) => ({ item_id: row.item_id, qty: row.qty }));
  const firstImage = resolved.find((row) => row.image)?.image ?? "";
  const description = `Includes ${formatComboIncludes(resolved)}`;
  const rounded = Math.round(price * 100) / 100;

  if (itemId) {
    const { data: current } = await supabase
      .from("catalog_items")
      .select("image")
      .eq("id", itemId)
      .eq("catalog_id", catalogId)
      .maybeSingle();
    const image = String(current?.image ?? "").trim() || firstImage;
    const { data, error } = await supabase
      .from("catalog_items")
      .update({
        name,
        price: rounded,
        description,
        image,
        is_combo: true,
        combo_lines: cleanLines,
        options: [],
      })
      .eq("id", itemId)
      .eq("catalog_id", catalogId)
      .select("id")
      .maybeSingle();
    if (isMissingComboColumn(error)) return { error: COMBOS_SQL_HINT };
    if (error || !data) {
      console.error("updateCombo: update failed", error);
      return { error: "Could not save the combo. Try again." };
    }
    revalidateItems(catalogId);
    return { saved: true };
  }

  const position = await nextPosition(supabase, catalogId);
  const { error } = await supabase.from("catalog_items").insert({
    catalog_id: catalogId,
    code: generateItemCode(),
    name,
    price: rounded,
    image: firstImage,
    category: "Combos",
    pack: "",
    description,
    barcode: null,
    options: [],
    featured: false,
    visible: true,
    position,
    is_combo: true,
    combo_lines: cleanLines,
  });

  if (isMissingComboColumn(error)) return { error: COMBOS_SQL_HINT };
  if (error) {
    console.error("addCombo: insert failed", error);
    if (error.code === "23505") {
      const retry = await supabase.from("catalog_items").insert({
        catalog_id: catalogId,
        code: generateItemCode(),
        name,
        price: rounded,
        image: firstImage,
        category: "Combos",
        pack: "",
        description,
        barcode: null,
        options: [],
        featured: false,
        visible: true,
        position,
        is_combo: true,
        combo_lines: cleanLines,
      });
      if (!retry.error) {
        revalidateItems(catalogId);
        return { saved: true };
      }
    }
    return { error: "Could not add the combo. Try again." };
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

  const supabase = await getCatalogAdminClient();
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

export type UpdateOptionsState = { error?: string; saved?: boolean } | null;

export async function updateItemOptions(
  catalogId: string,
  itemId: string,
  options: ItemOptionGroup[],
): Promise<UpdateOptionsState> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update({ options: parseOptionsFromForm(options) })
    .eq("id", itemId)
    .eq("catalog_id", catalogId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateItemOptions: update failed", error);
    if (error?.code === "42703" || error?.message?.includes("options")) {
      return { error: "Run supabase/restaurant.sql in the Supabase SQL editor, then try again." };
    }
    return { error: "Could not save options. Try again." };
  }

  revalidateItems(catalogId);
  return { saved: true };
}

export async function toggleItemFeatured(
  catalogId: string,
  itemId: string,
  featured: boolean,
): Promise<{ error?: string }> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update({ featured })
    .eq("id", itemId)
    .eq("catalog_id", catalogId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("toggleItemFeatured: update failed", error);
    if (error?.code === "42703" || error?.message?.includes("featured")) {
      return { error: MERCHANDISING_SQL_HINT };
    }
    return { error: "Could not update featured. Try again." };
  }

  revalidateItems(catalogId);
  return {};
}

export type UpdateItemState = { error?: string; saved?: boolean } | null;

export async function updateItem(
  catalogId: string,
  itemId: string,
  _prevState: UpdateItemState,
  formData: FormData,
): Promise<UpdateItemState> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const priceRaw = String(formData.get("price") ?? "").trim();
  const photo = formData.get("photo");
  let image = String(formData.get("image") ?? "").trim();
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadItemPhoto(catalogId, photo);
    if (uploaded.error || !uploaded.url) return { error: uploaded.error ?? "Could not upload the photo." };
    image = uploaded.url;
  }
  const category = String(formData.get("category") ?? "").trim().slice(0, 80);
  const pack = String(formData.get("pack") ?? "").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const barcodeRaw = String(formData.get("barcode") ?? "").trim().slice(0, 64);
  const barcode = barcodeRaw || null;
  const featured = formData.get("featured") === "1";
  const imageFit = parseItemImageFit(formData.get("imageFit"));

  const price = Number(priceRaw);
  if (!name) return { error: "Name is required." };
  if (!priceRaw || Number.isNaN(price) || price < 0) return { error: "Enter a valid price." };

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update({
      name,
      price: Math.round(price * 100) / 100,
      image,
      category,
      pack,
      description,
      barcode,
      featured,
      image_fit: imageFit,
    })
    .eq("id", itemId)
    .eq("catalog_id", catalogId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateItem: update failed", error);
    if (error?.code === "42703" || error?.message?.includes("featured") || error?.message?.includes("image_fit")) {
      return { error: MERCHANDISING_SQL_HINT };
    }
    return { error: "Could not save the item. Try again." };
  }

  revalidateItems(catalogId);
  return { saved: true };
}

export async function applyItemPlaceholder(
  catalogId: string,
  itemId: string,
  imageUrl: string,
): Promise<{ error?: string }> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };
  const allowed = STOCK_PHOTOS.some((photo) => photo.url === imageUrl);
  if (!allowed && imageUrl !== "") return { error: "Pick one of the stock photos." };

  const supabase = await getCatalogAdminClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update({ image: imageUrl })
    .eq("id", itemId)
    .eq("catalog_id", catalogId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("applyItemPlaceholder: update failed", error);
    return { error: "Could not set the photo. Try again." };
  }

  revalidateItems(catalogId);
  return {};
}

export async function deleteItem(
  catalogId: string,
  itemId: string,
): Promise<{ error?: string; deleted?: boolean }> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };

  const supabase = await getCatalogAdminClient();
  const { error } = await supabase
    .from("catalog_items")
    .delete()
    .eq("id", itemId)
    .eq("catalog_id", catalogId);

  if (error) {
    console.error("deleteItem: delete failed", error);
    return { error: "Could not delete the item. Try again." };
  }

  revalidateItems(catalogId);
  return { deleted: true };
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

  const supabase = await getCatalogAdminClient();
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

export type MappedImportInput = Pick<
  MappedImportRow,
  "name" | "price" | "description" | "category" | "pack" | "image" | "code" | "barcode"
> &
  Partial<Pick<MappedImportRow, "variant" | "variantGroup" | "options">>;

export type FileImportResult = {
  error?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  skipReasons?: string[];
};

export type FileImportMode = "upsert" | "replace";

export type FileImportOptions = {
  mode?: FileImportMode;
  fillPlaceholders?: boolean;
  placeholderKeyword?: string;
};

const FILE_IMPORT_LIMIT = 1000;

export async function fileImportItems(
  catalogId: string,
  rows: MappedImportInput[],
  options: FileImportOptions = {},
): Promise<FileImportResult> {
  const catalog = await ownedCatalog(catalogId);
  if (!catalog) return { error: "Catalog not found." };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No valid rows to import." };
  }
  if (rows.length > FILE_IMPORT_LIMIT) {
    return { error: `Import at most ${FILE_IMPORT_LIMIT} rows at a time.` };
  }

  const skipReasons: string[] = [];
  const valid: MappedImportRow[] = [];

  rows.forEach((raw, index) => {
    const name = String(raw?.name ?? "").trim().slice(0, 200);
    const price = Number(raw?.price);
    const code = String(raw?.code ?? "").trim().slice(0, 64);
    if (!name) {
      skipReasons.push(`Row ${index + 2}: missing name`);
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      skipReasons.push(`Row ${index + 2}: invalid price`);
      return;
    }
    valid.push({
      name,
      price: Math.round(price * 100) / 100,
      description: String(raw?.description ?? "").trim().slice(0, 2000),
      category: String(raw?.category ?? "").trim().slice(0, 80),
      pack: String(raw?.pack ?? "").trim().slice(0, 80),
      image: String(raw?.image ?? "").trim().slice(0, 2000),
      code,
      barcode: String(raw?.barcode ?? "").trim().slice(0, 64),
      variant: String(raw?.variant ?? "").trim().slice(0, 80),
      variantGroup: String(raw?.variantGroup ?? "").trim().slice(0, 64),
      options: parseOptionsFromForm(raw?.options),
    });
  });

  if (valid.length === 0) {
    return { error: "No valid rows found.", skipped: skipReasons.length, skipReasons: skipReasons.slice(0, 12) };
  }

  const folded = fillAutoCodesAndGroups(foldVariantRows(valid));
  const seenCodes = new Set<string>();
  const unique: MappedImportRow[] = [];
  for (const row of folded) {
    if (row.code && seenCodes.has(row.code.toLowerCase())) {
      skipReasons.push(`Duplicate code ${row.code} after grouping variants`);
      continue;
    }
    if (row.code) seenCodes.add(row.code.toLowerCase());
    unique.push(row);
  }

  const keyword = String(options.placeholderKeyword ?? "").trim().slice(0, 40);
  if (options.fillPlaceholders) {
    unique.forEach((row, index) => {
      if (!row.image) row.image = pickPlaceholder(keyword, index);
    });
  }

  const supabase = await getCatalogAdminClient();
  const replaceAll = options.mode === "replace";
  if (replaceAll) {
    const { error } = await supabase.from("catalog_items").delete().eq("catalog_id", catalogId);
    if (error) {
      console.error("fileImportItems: replace delete failed", error);
      return { error: "Could not replace the catalog. Try again." };
    }
  }

  const { data: existing } = replaceAll
    ? { data: [] as { code: string }[] }
    : await supabase.from("catalog_items").select("code").eq("catalog_id", catalogId);
  const existingByCode = new Map(
    (existing ?? []).map((row) => [String(row.code).toLowerCase(), String(row.code)]),
  );

  const updates = unique.filter((row) => row.code && existingByCode.has(row.code.toLowerCase()));
  const inserts = unique.filter((row) => !row.code || !existingByCode.has(row.code.toLowerCase()));

  for (const row of updates) {
    const storedCode = existingByCode.get(row.code.toLowerCase());
    const { error } = await supabase
      .from("catalog_items")
      .update({
        name: row.name,
        price: row.price,
        description: row.description,
        category: row.category,
        pack: row.pack,
        image: row.image,
        barcode: row.barcode || null,
        options: row.options,
      })
      .eq("catalog_id", catalogId)
      .eq("code", storedCode ?? row.code);
    if (error) {
      console.error("fileImportItems: update failed", error);
      if (error.code === "42703" || error.message?.includes("options")) {
        return { error: "Run supabase/restaurant.sql in the Supabase SQL editor, then try again." };
      }
      return { error: "Could not update existing items. Try again." };
    }
  }

  if (inserts.length > 0) {
    const start = await nextPosition(supabase, catalogId);
    const generated = uniqueCodes(inserts.filter((row) => !row.code).length);
    let generatedIndex = 0;
    const payload = inserts.map((row, index) => {
      const code = row.code || generated[generatedIndex++] || generateItemCode();
      return {
        catalog_id: catalogId,
        code,
        name: row.name,
        price: row.price,
        description: row.description,
        category: row.category,
        pack: row.pack,
        image: row.image,
        barcode: row.barcode || null,
        options: row.options,
        visible: true,
        position: start + index,
      };
    });

    const { error } = await supabase.from("catalog_items").insert(payload);
    if (error) {
      console.error("fileImportItems: insert failed", error);
      if (error.code === "42703" || error.message?.includes("options")) {
        return { error: "Run supabase/restaurant.sql in the Supabase SQL editor, then try again." };
      }
      return { error: "Could not import items. Try again." };
    }
  }

  revalidateItems(catalogId);
  return {
    imported: inserts.length,
    updated: updates.length,
    skipped: skipReasons.length,
    skipReasons: skipReasons.slice(0, 12),
  };
}
