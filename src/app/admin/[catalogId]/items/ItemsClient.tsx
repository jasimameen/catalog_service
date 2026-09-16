"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import dynamic from "next/dynamic";
import { formatMoney } from "@/lib/catalog/currency";
import type { CatalogItemRow, ImageFit, ItemOptionGroup } from "@/lib/supabase/types";
import { ItemOptionsEditor } from "@/components/admin/ItemOptionsEditor";
import { hasItemOptions, parseItemOptions } from "@/lib/catalog/item-options";
import {
  addItem,
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

const UploadImportModal = dynamic(
  () => import("./UploadImportModal").then((mod) => mod.UploadImportModal),
  { ssr: false },
);

function VisibleToggle({
  catalogId,
  item,
}: {
  catalogId: string;
  item: CatalogItemRow;
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
      className="text-xs font-medium disabled:opacity-50"
      style={{ color: visible ? "#1e9e4a" : "#b2432b" }}
    >
      {visible ? "On" : "Unavailable"}
    </button>
  );
}

function FeaturedToggle({
  catalogId,
  item,
}: {
  catalogId: string;
  item: CatalogItemRow;
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
      className="text-xs font-medium disabled:opacity-50"
      style={{ color: featured ? "#0b5fce" : "#86868b" }}
    >
      {featured ? "Yes" : "No"}
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
    <div>
      <p className="mb-1 text-xs font-medium text-[var(--cat-muted)]">Photo fit</p>
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
            className="cursor-pointer rounded-[10px] border border-[#e8e8ed] px-3 py-1.5 text-[12px] font-medium has-[:checked]:border-[var(--cat-accent)]"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={defaultValue === opt.value}
              className="sr-only"
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

function AddItemModal({ catalogId, onClose }: { catalogId: string; onClose: () => void }) {
  const boundAction = useMemo(() => addItem.bind(null, catalogId), [catalogId]);
  const [state, formAction, pending] = useActionState<AddItemState, FormData>(boundAction, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
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
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-md sm:rounded-2xl">
        <h3 className="m-0 text-[16px] font-semibold text-[var(--cat-ink)]">Add item</h3>
        <form action={formAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="options" value={JSON.stringify(options)} />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Name</label>
            <input
              name="name"
              required
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Price</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Description</label>
            <textarea
              name="description"
              rows={3}
              className="w-full resize-none rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Photo</label>
            <div className="flex items-center gap-3">
              <input
                name="photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setPreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                  });
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
                  setPreview(URL.createObjectURL(file));
                }}
                className="min-w-0 flex-1 text-[13px] text-[var(--cat-ink)] file:mr-2 file:rounded-lg file:border-0 file:bg-[#f5f5f7] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
              />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img
                  src={preview}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover bg-[var(--cat-photo-bg)]"
                />
              ) : null}
            </div>
            {photoError ? <p className="m-0 mt-1 text-xs text-[#b2432b]">{photoError}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Photo URL</label>
            <input
              name="image"
              type="url"
              placeholder="https://…"
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Category</label>
              <input
                name="category"
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Pack</label>
              <input
                name="pack"
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Barcode</label>
            <input
              name="barcode"
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[var(--cat-ink)]">
            <input type="checkbox" name="featured" value="1" />
            Featured on storefront
          </label>
          <ImageFitPicker name="imageFit" defaultValue="" />
          <ItemOptionsEditor options={options} onChange={setOptions} />
          {state?.error ? <p className="m-0 text-xs text-[#b2432b]">{state.error}</p> : null}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-[10px] bg-[var(--cat-accent)] py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add item"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[#d2d2d7] bg-white py-2.5 text-[13px] font-medium text-[var(--cat-ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasteImportModal({ catalogId, onClose }: { catalogId: string; onClose: () => void }) {
  const boundAction = useMemo(() => pasteImportItems.bind(null, catalogId), [catalogId]);
  const [state, formAction, pending] = useActionState<PasteImportState, FormData>(boundAction, null);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="m-0 text-[16px] font-semibold text-[var(--cat-ink)]">Paste from spreadsheet</h3>
        <p className="mt-1.5 text-xs text-[var(--cat-muted)]">
          One item per line: <code>Name, Price</code> (category, pack and photo URL are optional
          extra columns, in that order).
        </p>
        <form action={formAction} className="mt-4 flex flex-col gap-3">
          <textarea
            name="bulk"
            required
            rows={8}
            placeholder={"Flat Mop, 15.25\nBucket with Wringer, 22.00, Cleaning, 15L"}
            className="w-full resize-none rounded-[10px] border border-[#d2d2d7] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--cat-accent)]"
          />
          {state?.error ? <p className="m-0 text-xs text-[#b2432b]">{state.error}</p> : null}
          {state?.imported ? (
            <p className="m-0 text-xs text-[#1e9e4a]">Imported {state.imported} items.</p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-[10px] bg-[var(--cat-accent)] py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {pending ? "Importing…" : "Import"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[#d2d2d7] bg-white py-2.5 text-[13px] font-medium text-[var(--cat-ink)]"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-md sm:rounded-2xl">
        <h3 className="m-0 text-[16px] font-semibold text-[var(--cat-ink)]">Edit options</h3>
        <p className="mt-1 text-xs text-[var(--cat-muted)]">{item.name}</p>
        <div className="mt-4">
          <ItemOptionsEditor options={options} onChange={setOptions} />
        </div>
        {error ? <p className="mt-3 text-xs text-[#b2432b]">{error}</p> : null}
        <div className="mt-4 flex gap-2">
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
            className="min-h-11 flex-1 rounded-[10px] bg-[var(--cat-accent)] text-[13px] font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save options"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-[10px] border border-[#d2d2d7] bg-white text-[13px] font-medium text-[var(--cat-ink)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
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

  useEffect(() => {
    if (state?.saved) onClose();
  }, [state, onClose]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview ?? item.image;

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-md sm:rounded-2xl">
        <h3 className="m-0 text-[16px] font-semibold text-[var(--cat-ink)]">Edit item</h3>
        <form action={formAction} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Name</label>
            <input
              name="name"
              required
              defaultValue={item.name}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Price</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={Number(item.price)}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={item.description}
              className="w-full resize-none rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Photo</label>
            <div className="flex items-center gap-3">
              <input
                name="photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setPreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                  });
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
                  setPreview(URL.createObjectURL(file));
                }}
                className="min-w-0 flex-1 text-[13px] text-[var(--cat-ink)] file:mr-2 file:rounded-lg file:border-0 file:bg-[#f5f5f7] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
              />
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL or current photo
                <img
                  src={shown}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover bg-[var(--cat-photo-bg)]"
                />
              ) : null}
            </div>
            {photoError ? <p className="m-0 mt-1 text-xs text-[#b2432b]">{photoError}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Photo URL</label>
            <input
              name="image"
              type="url"
              defaultValue={item.image}
              placeholder="https://…"
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Category</label>
              <input
                name="category"
                defaultValue={item.category}
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Pack</label>
              <input
                name="pack"
                defaultValue={item.pack}
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">Barcode</label>
            <input
              name="barcode"
              defaultValue={item.barcode ?? ""}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[var(--cat-ink)]">
            <input type="checkbox" name="featured" value="1" defaultChecked={Boolean(item.featured)} />
            Featured on storefront
          </label>
          <ImageFitPicker name="imageFit" defaultValue={parseItemImageFit(item.image_fit) ?? ""} />
          {state?.error ? <p className="m-0 text-xs text-[#b2432b]">{state.error}</p> : null}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-[10px] bg-[var(--cat-accent)] py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save item"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[#d2d2d7] bg-white py-2.5 text-[13px] font-medium text-[var(--cat-ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-2xl bg-white p-6 sm:max-w-md sm:rounded-2xl">
        <h3 className="m-0 text-[16px] font-semibold text-[var(--cat-ink)]">Delete item?</h3>
        <p className="mt-2 text-[13px] text-[var(--cat-muted)]">
          {item.name} will be removed from the catalog. This cannot be undone.
        </p>
        {error ? <p className="mt-3 text-xs text-[#b2432b]">{error}</p> : null}
        <div className="mt-4 flex gap-2">
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
            className="min-h-11 flex-1 rounded-[10px] bg-[#b2432b] text-[13px] font-medium text-white disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-[10px] border border-[#d2d2d7] bg-white text-[13px] font-medium text-[var(--cat-ink)]"
          >
            Cancel
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
  const [showAdd, setShowAdd] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItemRow | null>(null);
  const [editDetails, setEditDetails] = useState<CatalogItemRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItemRow | null>(null);

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.category.trim() !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex min-w-[200px] flex-1 flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
            className="min-w-[180px] max-w-[320px] flex-1 rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
          {categories.length > 0 ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-[10px] border border-[#d2d2d7] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            >
              <option value="">All categories</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="rounded-[10px] border border-[#d2d2d7] bg-white px-3.5 py-2 text-[13px] font-medium text-[var(--cat-ink)]"
          >
            Upload catalog
          </button>
          <button
            type="button"
            onClick={() => setShowPaste(true)}
            className="rounded-[10px] border border-[#d2d2d7] bg-white px-3.5 py-2 text-[13px] font-medium text-[var(--cat-ink)]"
          >
            Paste from spreadsheet
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-[10px] bg-[var(--cat-accent)] px-3.5 py-2 text-[13px] font-medium text-white"
          >
            Add item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--cat-border)]">
        <div className="grid min-w-[720px] grid-cols-[56px_minmax(0,2fr)_1fr_1fr_80px_70px_minmax(140px,auto)] gap-3 border-b border-[var(--cat-border)] bg-[#fbfbfd] px-[18px] py-3 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
          <span></span>
          <span>Item</span>
          <span>Code</span>
          <span>Price</span>
          <span>Visible</span>
          <span>Featured</span>
          <span></span>
        </div>
        {filtered.length === 0 ? (
          <p className="p-[18px] text-[13px] text-[var(--cat-muted)]">
            {items.length === 0
              ? "No items yet. Add one, or upload a CSV / Excel file."
              : "No items match your search."}
          </p>
        ) : (
          filtered.map((item, index) => (
            <div
              key={item.id}
              className="grid min-w-[720px] grid-cols-[56px_minmax(0,2fr)_1fr_1fr_80px_70px_minmax(140px,auto)] items-center gap-3 border-b border-[#f0f0f4] px-[18px] py-2.5 last:border-b-0"
            >
              <div className="h-10 w-10 overflow-hidden rounded-lg bg-[var(--cat-photo-bg)]">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-provided image URLs
                  <img
                    src={item.image}
                    alt=""
                    width={40}
                    height={40}
                    loading={index < 12 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="m-0 truncate text-[13px] font-medium text-[var(--cat-ink)]">{item.name}</p>
                <p className="m-0 mt-0.5 truncate text-xs text-[#86868b]">
                  {item.category ? `${item.category}${item.description ? " · " : ""}` : ""}
                  {item.description}
                </p>
              </div>
              <span className="truncate text-[13px] text-[var(--cat-muted)]">{item.code}</span>
              <span className="text-[13px] font-medium text-[var(--cat-ink)]">
                {formatMoney(Number(item.price), currency)}
              </span>
              <VisibleToggle catalogId={catalogId} item={item} />
              <FeaturedToggle catalogId={catalogId} item={item} />
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={() => setEditDetails(item)}
                  className="min-h-11 text-xs font-medium text-[var(--cat-accent)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setEditItem(item)}
                  className="min-h-11 text-xs font-medium text-[var(--cat-accent)]"
                >
                  {hasItemOptions(item) ? "Options" : "Variants"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  className="min-h-11 text-xs font-medium text-[#b2432b]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd ? <AddItemModal catalogId={catalogId} onClose={() => setShowAdd(false)} /> : null}
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
