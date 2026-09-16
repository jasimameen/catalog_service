"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { formatMoney } from "@/lib/catalog/currency";
import type { CatalogItemRow, ImageFit, ItemOptionGroup } from "@/lib/supabase/types";
import { ItemOptionsEditor } from "@/components/admin/ItemOptionsEditor";
import { formatComboIncludes, isComboItem, parseComboLines, resolveComboIncludes } from "@/lib/catalog/combos";
import { itemOptionSearchText, parseItemOptions, variantColumnLabel } from "@/lib/catalog/item-options";
import { ComboModal } from "./ComboModal";
import {
  addItem,
  applyItemPlaceholder,
  deleteItem,
  pasteImportItems,
  toggleItemFeatured,
  toggleItemVisible,
  updateItem,
  updateItemOptions,
  type AddItemState,
  type PasteImportState,
  type UpdateItemState,
} from "./actions";
import { parseItemImageFit } from "@/lib/catalog/merchandising";
import { PlaceholderPicker } from "@/components/admin/PlaceholderPicker";
import {
  AdminSheet,
  AdminSheetBody,
  AdminSheetFooter,
  AdminSheetHeader,
  btnDanger,
  btnGhost,
  btnPrimary,
  fieldInput,
  fieldLabel,
} from "./sheet";

const UploadImportModal = dynamic(
  () => import("./UploadImportModal").then((mod) => mod.UploadImportModal),
  { ssr: false },
);

function RowPlaceholderButton({
  catalogId,
  itemId,
  size = "md",
}: {
  catalogId: string;
  itemId: string;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = size === "lg" ? "h-11 w-11 rounded-[10px]" : "h-10 w-10 rounded-[9px]";

  return (
    <div className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((prev) => !prev)}
        className={`${box} border border-dashed border-[#c3ccd9] bg-white text-[10px] text-[#5a6472] hover:border-[#0b5fce] hover:text-[#0b5fce] disabled:opacity-50`}
      >
        Photo
      </button>
      {open ? (
        <div className="absolute left-0 top-12 z-20 w-64 rounded-xl border border-[#e2e7ee] bg-white p-2.5 shadow-lg">
          <PlaceholderPicker
            value=""
            onSelect={(url) =>
              startTransition(async () => {
                await applyItemPlaceholder(catalogId, itemId, url);
                router.refresh();
                setOpen(false);
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function VisibleToggle({
  catalogId,
  item,
  compact,
}: {
  catalogId: string;
  item: CatalogItemRow;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [override, setOverride] = useState<boolean | null>(null);
  const visible = override ?? item.visible;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !visible;
          setOverride(next);
          const result = await toggleItemVisible(catalogId, item.id, next);
          setOverride(result.error ? !next : null);
        })
      }
      className={`${compact ? "min-h-8 px-2.5 text-[12px]" : "min-h-10 px-3 text-[13px]"} rounded-[10px] border font-medium disabled:opacity-50 ${
        visible
          ? "border-[#cdead9] bg-[#f1faf4] text-[#1e9e4a]"
          : "border-[#f0d3cd] bg-[#fdf3f1] text-[#b2432b]"
      }`}
    >
      {visible ? "Available" : "Unavailable"}
    </button>
  );
}

function FeaturedToggle({
  catalogId,
  item,
  compact,
}: {
  catalogId: string;
  item: CatalogItemRow;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [override, setOverride] = useState<boolean | null>(null);
  const featured = override ?? Boolean(item.featured);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !featured;
          setOverride(next);
          const result = await toggleItemFeatured(catalogId, item.id, next);
          setOverride(result.error ? !next : null);
        })
      }
      className={`${compact ? "min-h-8 px-2.5 text-[12px]" : "min-h-10 px-3 text-[13px]"} rounded-[10px] border bg-white font-medium disabled:opacity-50 ${
        featured ? "border-[#9dc0ef] text-[#0b5fce]" : "border-[#e2e7ee] text-[#8a93a2]"
      }`}
    >
      {compact ? (featured ? "Yes" : "No") : featured ? "Featured" : "Not featured"}
    </button>
  );
}

function ImageFitPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: ImageFit | "";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={fieldLabel}>Photo fit</span>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "", label: "Catalog default" },
            { value: "cover", label: "Cover" },
            { value: "contain", label: "Contain" },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value || "default"}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#eef4fd]"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={defaultValue === opt.value}
              className="accent-[#0b5fce]"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

const PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function PhotoField({
  preview,
  onPreview,
  photoError,
  setPhotoError,
}: {
  preview: string | null;
  onPreview: (url: string | null) => void;
  photoError: string | null;
  setPhotoError: (error: string | null) => void;
}) {
  return (
    <div>
      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          onPreview(null);
          if (!file) {
            setPhotoError(null);
            return;
          }
          if (file.size > MAX_PHOTO_BYTES) {
            setPhotoError("Photo must be 4MB or smaller.");
            e.target.value = "";
            return;
          }
          if (file.type && !PHOTO_TYPES.has(file.type)) {
            setPhotoError("Use a JPEG, PNG, WebP, or GIF photo.");
            e.target.value = "";
            return;
          }
          setPhotoError(null);
          onPreview(URL.createObjectURL(file));
        }}
        className="text-[13px] text-[#101720]"
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
        <img
          src={preview}
          alt=""
          className="mt-2 h-10 w-10 rounded-lg bg-[var(--cat-photo-bg)] object-cover"
        />
      ) : null}
      {photoError ? <p className="m-0 mt-1 text-[12px] text-[#b42318]">{photoError}</p> : null}
    </div>
  );
}

function AddItemModal({ catalogId, onClose }: { catalogId: string; onClose: () => void }) {
  const boundAction = useMemo(() => addItem.bind(null, catalogId), [catalogId]);
  const [state, formAction, pending] = useActionState<AddItemState, FormData>(boundAction, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [options, setOptions] = useState<ItemOptionGroup[]>([]);

  useEffect(() => {
    if (state?.saved) onClose();
  }, [state, onClose]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <AdminSheet onClose={onClose} labelledBy="add-item-title">
      <AdminSheetHeader id="add-item-title" title="Add item" onClose={onClose} />
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <AdminSheetBody>
          <input type="hidden" name="options" value={JSON.stringify(options)} />
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 basis-[200px] flex-col gap-1.5">
              <span className={fieldLabel}>Name *</span>
              <input name="name" required className={fieldInput} />
            </label>
            <label className="flex flex-[0_1_140px] flex-col gap-1.5">
              <span className={fieldLabel}>Price *</span>
              <input name="price" type="number" step="0.01" min="0" required className={fieldInput} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Description</span>
            <textarea name="description" rows={2} className={`${fieldInput} h-auto py-2.5`} />
          </label>
          <div className="flex flex-col gap-2.5 rounded-xl border border-[#e2e7ee] bg-[#fbfbfd] p-3.5">
            <span className={fieldLabel}>Photo</span>
            <PhotoField
              preview={preview}
              onPreview={(url) => {
                setPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return url;
                });
              }}
              photoError={photoError}
              setPhotoError={setPhotoError}
            />
            <input
              name="image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="min-h-11 rounded-[11px] border border-[#e2e7ee] bg-white px-3 text-[14px] outline-none focus:border-[#0b5fce]"
            />
            <PlaceholderPicker value={imageUrl} onSelect={setImageUrl} />
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 basis-[160px] flex-col gap-1.5">
              <span className={fieldLabel}>Category</span>
              <input name="category" className={fieldInput} />
            </label>
            <label className="flex min-w-0 flex-1 basis-[120px] flex-col gap-1.5">
              <span className={fieldLabel}>Pack</span>
              <input name="pack" className={fieldInput} />
            </label>
            <label className="flex min-w-0 flex-1 basis-[150px] flex-col gap-1.5">
              <span className={fieldLabel}>Barcode</span>
              <input name="barcode" className={fieldInput} />
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="featured" value="1" className="h-[17px] w-[17px] accent-[#0b5fce]" />
            Featured on storefront
          </label>
          <ImageFitPicker name="imageFit" defaultValue="" />
          <div className="border-t border-[#edf0f4] pt-3.5">
            <ItemOptionsEditor options={options} onChange={setOptions} />
          </div>
          {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
        </AdminSheetBody>
        <AdminSheetFooter>
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Adding…" : "Add item"}
          </button>
        </AdminSheetFooter>
      </form>
    </AdminSheet>
  );
}

function PasteImportModal({ catalogId, onClose }: { catalogId: string; onClose: () => void }) {
  const boundAction = useMemo(() => pasteImportItems.bind(null, catalogId), [catalogId]);
  const [state, formAction, pending] = useActionState<PasteImportState, FormData>(boundAction, null);

  return (
    <AdminSheet onClose={onClose} labelledBy="paste-sheet-title">
      <AdminSheetHeader
        id="paste-sheet-title"
        title="Paste from spreadsheet"
        helper='One item per line: Name, Price (category, pack and photo URL are optional extra columns, in that order).'
        onClose={onClose}
      />
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <AdminSheetBody>
          <textarea
            name="bulk"
            required
            rows={7}
            placeholder={"Flat Mop, 15.25\nBucket with Wringer, 22.00, Cleaning, 15L"}
            className="resize-y rounded-xl border border-[#e2e7ee] bg-[#fbfbfd] px-3 py-3 font-mono text-[13px] leading-relaxed outline-none focus:border-[#0b5fce]"
          />
          {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
          {state?.imported ? (
            <p className="m-0 text-[13px] text-[#1e9e4a]">Imported {state.imported} items.</p>
          ) : null}
        </AdminSheetBody>
        <AdminSheetFooter>
          <button type="button" onClick={onClose} className={btnGhost}>
            Close
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Importing…" : "Import"}
          </button>
        </AdminSheetFooter>
      </form>
    </AdminSheet>
  );
}

function EditOptionsModal({
  catalogId,
  item,
  onClose,
}: {
  catalogId: string;
  item: CatalogItemRow;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<ItemOptionGroup[]>(() => parseItemOptions(item.options));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AdminSheet onClose={onClose} labelledBy="options-sheet-title">
      <AdminSheetHeader id="options-sheet-title" title="Edit options" onClose={onClose} />
      <AdminSheetBody>
        <p className="m-0 text-[14px] font-medium text-[#101720]">{item.name}</p>
        <ItemOptionsEditor options={options} onChange={setOptions} />
        {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
      </AdminSheetBody>
      <AdminSheetFooter>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateItemOptions(catalogId, item.id, options);
              if (result?.error) setError(result.error);
              else onClose();
            })
          }
          className={btnPrimary}
        >
          {pending ? "Saving…" : "Save options"}
        </button>
      </AdminSheetFooter>
    </AdminSheet>
  );
}

function EditItemModal({
  catalogId,
  item,
  onClose,
}: {
  catalogId: string;
  item: CatalogItemRow;
  onClose: () => void;
}) {
  const boundAction = useMemo(
    () => updateItem.bind(null, catalogId, item.id),
    [catalogId, item.id],
  );
  const [state, formAction, pending] = useActionState<UpdateItemState, FormData>(boundAction, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(item.image);

  useEffect(() => {
    if (state?.saved) onClose();
  }, [state, onClose]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview ?? imageUrl;

  return (
    <AdminSheet onClose={onClose} labelledBy="edit-item-title">
      <AdminSheetHeader id="edit-item-title" title="Edit item" onClose={onClose} />
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <AdminSheetBody>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 basis-[200px] flex-col gap-1.5">
              <span className={fieldLabel}>Name *</span>
              <input name="name" required defaultValue={item.name} className={fieldInput} />
            </label>
            <label className="flex flex-[0_1_140px] flex-col gap-1.5">
              <span className={fieldLabel}>Price *</span>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={Number(item.price)}
                className={fieldInput}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Description</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={item.description}
              className={`${fieldInput} h-auto py-2.5`}
            />
          </label>
          <div className="flex flex-col gap-2.5 rounded-xl border border-[#e2e7ee] bg-[#fbfbfd] p-3.5">
            <span className={fieldLabel}>Photo</span>
            <PhotoField
              preview={preview}
              onPreview={(url) => {
                setPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return url;
                });
              }}
              photoError={photoError}
              setPhotoError={setPhotoError}
            />
            {shown && !preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- current catalog photo
              <img
                src={shown}
                alt=""
                className="h-10 w-10 rounded-lg bg-[var(--cat-photo-bg)] object-cover"
              />
            ) : null}
            <input
              name="image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="min-h-11 rounded-[11px] border border-[#e2e7ee] bg-white px-3 text-[14px] outline-none focus:border-[#0b5fce]"
            />
            <PlaceholderPicker value={imageUrl} onSelect={setImageUrl} />
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 basis-[160px] flex-col gap-1.5">
              <span className={fieldLabel}>Category</span>
              <input name="category" defaultValue={item.category} className={fieldInput} />
            </label>
            <label className="flex min-w-0 flex-1 basis-[120px] flex-col gap-1.5">
              <span className={fieldLabel}>Pack</span>
              <input name="pack" defaultValue={item.pack} className={fieldInput} />
            </label>
            <label className="flex min-w-0 flex-1 basis-[150px] flex-col gap-1.5">
              <span className={fieldLabel}>Barcode</span>
              <input name="barcode" defaultValue={item.barcode ?? ""} className={fieldInput} />
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px]">
            <input
              type="checkbox"
              name="featured"
              value="1"
              defaultChecked={Boolean(item.featured)}
              className="h-[17px] w-[17px] accent-[#0b5fce]"
            />
            Featured on storefront
          </label>
          <ImageFitPicker name="imageFit" defaultValue={parseItemImageFit(item.image_fit) ?? ""} />
          {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
        </AdminSheetBody>
        <AdminSheetFooter>
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Saving…" : "Save item"}
          </button>
        </AdminSheetFooter>
      </form>
    </AdminSheet>
  );
}

function DeleteItemModal({
  catalogId,
  item,
  onClose,
}: {
  catalogId: string;
  item: CatalogItemRow;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AdminSheet onClose={onClose} labelledBy="delete-item-title">
      <AdminSheetHeader id="delete-item-title" title="Delete item?" onClose={onClose} />
      <AdminSheetBody>
        <p className="m-0 text-[14px] leading-relaxed text-[#46505e]">
          {item.name} will be removed from the catalog. This cannot be undone.
        </p>
        {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
      </AdminSheetBody>
      <AdminSheetFooter>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteItem(catalogId, item.id);
              if (result.error) setError(result.error);
              else onClose();
            })
          }
          className={btnDanger}
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </AdminSheetFooter>
    </AdminSheet>
  );
}

function ItemPhoto({
  catalogId,
  item,
  eager,
  size,
}: {
  catalogId: string;
  item: CatalogItemRow;
  eager: boolean;
  size: "md" | "lg";
}) {
  const box = size === "lg" ? "h-11 w-11 rounded-[10px]" : "h-10 w-10 rounded-[9px]";
  if (item.image) {
    return (
      <div className={`${box} overflow-hidden bg-[#eef1f5]`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user-provided image URLs */}
        <img
          src={item.image}
          alt=""
          width={size === "lg" ? 44 : 40}
          height={size === "lg" ? 44 : 40}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return <RowPlaceholderButton catalogId={catalogId} itemId={item.id} size={size} />;
}

function ItemTile({
  catalogId,
  item,
  items,
  currency,
  eager,
  onEdit,
  onOptions,
  onDelete,
}: {
  catalogId: string;
  item: CatalogItemRow;
  items: CatalogItemRow[];
  currency: string;
  eager: boolean;
  onEdit: () => void;
  onOptions: () => void;
  onDelete: () => void;
}) {
  const combo = isComboItem(item);
  const optionGroups = combo
    ? []
    : parseItemOptions(item.options).filter((group) => group.values.length > 0);
  const includes = combo
    ? formatComboIncludes(resolveComboIncludes(parseComboLines(item.combo_lines), items))
    : "";
  const sub = [item.category, item.description].filter(Boolean).join(" · ");
  const optionsLabel = optionGroups.length > 0 ? "Options" : "Variants";

  const variantCue =
    optionGroups.length > 0 ? (
      <div className="mt-1 flex flex-col gap-1">
        {optionGroups.map((group, index) => (
          <div key={`${group.name}-${index}`} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-medium text-[#5a6472]">{group.name}</span>
            <span className="text-[12px] text-[#8a93a2]">·</span>
            {group.values.map((value) => (
              <span
                key={value.name}
                className="rounded-full border border-[#dfe4ec] bg-[#fbfbfd] px-2 py-0.5 text-[11px] font-medium text-[#101720]"
              >
                {value.name}
              </span>
            ))}
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div className="border-b border-[#f1f4f8] last:border-b-0">
      <div className="hidden min-w-[1000px] items-start gap-3 px-[18px] py-3 hover:bg-[#fafbfd] md:flex">
        <div className="w-10 shrink-0">
          <ItemPhoto catalogId={catalogId} item={item} eager={eager} size="md" />
        </div>
        <div className="min-w-[220px] flex-1 basis-[260px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] font-medium text-[#101720]">{item.name}</span>
            {combo ? (
              <span className="rounded-full bg-[#eaf1fc] px-2 py-0.5 text-[11px] font-medium text-[#0b5fce]">
                Combo
              </span>
            ) : null}
          </div>
          {sub ? <p className="m-0 mt-0.5 text-[12px] text-[#8a93a2]">{sub}</p> : null}
          {combo && includes ? (
            <p className="m-0 mt-0.5 text-[12px] text-[#5a6472]">Includes {includes}</p>
          ) : (
            variantCue
          )}
        </div>
        <div className="w-[110px] shrink-0 font-mono text-[12px] text-[#46505e]">{item.code}</div>
        <div className="w-24 shrink-0 text-right text-[14px] tabular-nums">
          {formatMoney(Number(item.price), currency)}
        </div>
        <div
          className={`w-[96px] shrink-0 text-[12px] font-medium ${
            combo ? "text-[#0b5fce]" : optionGroups.length > 0 ? "text-[#101720]" : "text-[#8a93a2]"
          }`}
        >
          {variantColumnLabel(item)}
        </div>
        <div className="w-[104px] shrink-0">
          <VisibleToggle catalogId={catalogId} item={item} compact />
        </div>
        <div className="w-[86px] shrink-0">
          <FeaturedToggle catalogId={catalogId} item={item} compact />
        </div>
        <div className="flex w-[210px] shrink-0 justify-end gap-1.5">
          <button type="button" onClick={onEdit} className={`${btnGhost} min-h-8 px-2.5 text-[12px]`}>
            Edit
          </button>
          {combo ? null : (
            <button type="button" onClick={onOptions} className={`${btnGhost} min-h-8 px-2.5 text-[12px]`}>
              {optionsLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className={`${btnGhost} min-h-8 px-2.5 text-[12px] text-[#b42318] hover:border-[#e3b4ae]`}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-3.5 py-3.5 md:hidden">
        <div className="flex items-start gap-2.5">
          <ItemPhoto catalogId={catalogId} item={item} eager={eager} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[15px] font-medium text-[#101720]">{item.name}</span>
              {combo ? (
                <span className="rounded-full bg-[#eaf1fc] px-2 py-0.5 text-[11px] font-medium text-[#0b5fce]">
                  Combo
                </span>
              ) : null}
            </div>
            {sub ? <p className="m-0 mt-0.5 text-[12px] text-[#8a93a2]">{sub}</p> : null}
            {combo && includes ? (
              <p className="m-0 mt-0.5 text-[12px] leading-snug text-[#5a6472]">Includes {includes}</p>
            ) : (
              variantCue
            )}
            <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
              <span className="font-mono text-[12px] text-[#46505e]">{item.code}</span>
              <span className="text-[15px] font-semibold tabular-nums">
                {formatMoney(Number(item.price), currency)}
              </span>
              <span
                className={`text-[12px] font-medium ${
                  combo ? "text-[#0b5fce]" : optionGroups.length > 0 ? "text-[#101720]" : "text-[#8a93a2]"
                }`}
              >
                Variants {variantColumnLabel(item)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <VisibleToggle catalogId={catalogId} item={item} />
          <FeaturedToggle catalogId={catalogId} item={item} />
          <div className="flex-1" />
          <button type="button" onClick={onEdit} className={`${btnGhost} min-h-10 px-3 text-[13px]`}>
            Edit
          </button>
          {combo ? null : (
            <button type="button" onClick={onOptions} className={`${btnGhost} min-h-10 px-3 text-[13px]`}>
              {optionsLabel}
            </button>
          )}
          <button
            type="button"
            aria-label="Delete item"
            onClick={onDelete}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e2e7ee] bg-white text-[13px] text-[#b42318]"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export function ItemsClient({
  catalogId,
  items,
  currency,
}: {
  catalogId: string;
  items: CatalogItemRow[];
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [view, setView] = useState<"list" | "category" | "combos">("list");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItemRow | null>(null);
  const [editDetails, setEditDetails] = useState<CatalogItemRow | null>(null);
  const [editCombo, setEditCombo] = useState<CatalogItemRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItemRow | null>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const comboCount = useMemo(() => items.filter(isComboItem).length, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      // Variant-folded items stay in All and By category; Combos view is combos only.
      if (view === "combos" && !isComboItem(item)) return false;
      if (category && item.category.trim() !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        itemOptionSearchText(item.options).includes(q)
      );
    });
  }, [items, query, category, view]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, CatalogItemRow[]>();
    for (const item of filtered) {
      const key = item.category.trim() || "Uncategorized";
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(item);
    }
    return order.map((name) => ({ name, items: map.get(name)! }));
  }, [filtered]);

  const searching = query.trim().length > 0;
  const emptyCopy = filtered.length
    ? ""
    : view === "combos"
      ? "No combos yet. Use Add combo to bundle products into one price."
      : items.length
        ? "No items match your search."
        : "No items yet. Add one, or upload a CSV / Excel file.";

  function renderItem(item: CatalogItemRow, index: number) {
    return (
      <ItemTile
        key={item.id}
        catalogId={catalogId}
        item={item}
        items={items}
        currency={currency}
        eager={index < 12}
        onEdit={() => (isComboItem(item) ? setEditCombo(item) : setEditDetails(item))}
        onOptions={() => setEditItem(item)}
        onDelete={() => setDeleteTarget(item)}
      />
    );
  }

  const viewBtn = (key: typeof view, label: string) => (
    <button
      type="button"
      onClick={() => setView(key)}
      className={`min-h-[38px] rounded-lg px-3.5 text-[13px] ${
        view === key ? "bg-[#101720] text-white" : "bg-transparent text-[#5a6472]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3.5">
      <section className="flex flex-wrap items-end gap-3 rounded-[14px] border border-[#e2e7ee] bg-white p-3.5">
        <label className="flex w-full min-w-0 flex-1 basis-full flex-col gap-1.5 sm:basis-[240px]">
          <span className={fieldLabel}>Search</span>
          <input
            id="items-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, code, or category"
            className={fieldInput}
          />
        </label>
        <label className="flex flex-[0_1_190px] flex-col gap-1.5">
          <span className={fieldLabel}>Category</span>
          <select
            id="items-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-11 rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-2.5 text-[14px] outline-none focus:border-[#0b5fce]"
          >
            <option value="">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>View</span>
          <div className="flex gap-1 rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] p-[3px]">
            {viewBtn("list", "All")}
            {viewBtn("category", "By category")}
            {viewBtn("combos", `Combos ${comboCount}`)}
          </div>
        </div>
        <div className="hidden flex-1 md:block" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative hidden flex-wrap gap-2 sm:flex">
            <button type="button" onClick={() => setShowUpload(true)} className={btnGhost}>
              Upload catalog
            </button>
            <button type="button" onClick={() => setShowPaste(true)} className={btnGhost}>
              Paste from spreadsheet
            </button>
            <button type="button" onClick={() => setShowCombo(true)} className={btnGhost}>
              Add combo
            </button>
          </div>
          <div className="relative sm:hidden" ref={moreRef}>
            <button type="button" onClick={() => setMoreOpen((prev) => !prev)} className={btnGhost}>
              More
            </button>
            {moreOpen ? (
              <div className="absolute left-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-[#e2e7ee] bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(true);
                    setMoreOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center px-3.5 text-left text-[14px] hover:bg-[#f4f6f9]"
                >
                  Upload catalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaste(true);
                    setMoreOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center px-3.5 text-left text-[14px] hover:bg-[#f4f6f9]"
                >
                  Paste from spreadsheet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCombo(true);
                    setMoreOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center px-3.5 text-left text-[14px] hover:bg-[#f4f6f9]"
                >
                  Add combo
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => setShowAdd(true)} className={btnPrimary}>
            Add item
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-[14px] border border-[#e2e7ee] bg-white">
        <div className="hidden min-w-[1000px] gap-3 border-b border-[#edf0f4] bg-[#fbfbfd] px-[18px] py-2.5 text-[11px] uppercase tracking-[0.08em] text-[#8a93a2] md:flex">
          <div className="w-10 shrink-0" />
          <div className="min-w-0 flex-1 basis-[260px]">Item</div>
          <div className="w-[110px] shrink-0">Code</div>
          <div className="w-24 shrink-0 text-right">Price</div>
          <div className="w-[96px] shrink-0">Variants</div>
          <div className="w-[104px] shrink-0">Available</div>
          <div className="w-[86px] shrink-0">Featured</div>
          <div className="w-[210px] shrink-0" />
        </div>
        {filtered.length === 0 ? (
          <div className="px-[18px] py-12 text-center text-[14px] text-[#8a93a2]">{emptyCopy}</div>
        ) : view === "category" ? (
          grouped.map((section) => {
            const open = searching || openCats[section.name] !== false;
            return (
              <div key={section.name}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenCats((prev) => ({ ...prev, [section.name]: !open }))
                  }
                  className="flex min-h-12 w-full items-center gap-2.5 border-b border-[#edf0f4] bg-[#f4f6f9] px-[18px] text-left"
                >
                  <span
                    className="w-3.5 text-[11px] text-[#5a6472] transition-transform"
                    style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
                  >
                    ▸
                  </span>
                  <span className="flex-1 text-[13px] font-semibold md:text-[13px]">{section.name}</span>
                  <span className="text-[12px] text-[#8a93a2]">{section.items.length}</span>
                </button>
                {open ? section.items.map((item, index) => renderItem(item, index)) : null}
              </div>
            );
          })
        ) : (
          filtered.map((item, index) => renderItem(item, index))
        )}
      </section>

      {showAdd ? <AddItemModal catalogId={catalogId} onClose={() => setShowAdd(false)} /> : null}
      {showCombo ? (
        <ComboModal catalogId={catalogId} items={items} currency={currency} onClose={() => setShowCombo(false)} />
      ) : null}
      {editCombo ? (
        <ComboModal
          catalogId={catalogId}
          items={items}
          currency={currency}
          editing={editCombo}
          onClose={() => setEditCombo(null)}
        />
      ) : null}
      {showPaste ? <PasteImportModal catalogId={catalogId} onClose={() => setShowPaste(false)} /> : null}
      {showUpload ? <UploadImportModal catalogId={catalogId} onClose={() => setShowUpload(false)} /> : null}
      {editItem ? (
        <EditOptionsModal catalogId={catalogId} item={editItem} onClose={() => setEditItem(null)} />
      ) : null}
      {editDetails ? (
        <EditItemModal catalogId={catalogId} item={editDetails} onClose={() => setEditDetails(null)} />
      ) : null}
      {deleteTarget ? (
        <DeleteItemModal catalogId={catalogId} item={deleteTarget} onClose={() => setDeleteTarget(null)} />
      ) : null}
    </div>
  );
}
