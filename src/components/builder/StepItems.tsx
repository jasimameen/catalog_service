"use client";

import { useRef, useState } from "react";
import type { DraftItem } from "./types";

interface StepItemsProps {
  items: DraftItem[];
  currency: string;
  onAdd: (item: { name: string; price: number; image: string }) => void;
  onRemove: (tempId: string) => void;
}

/**
 * Step 1 — "What are you selling?" Inline add-row (photo, name, price,
 * Add) + the running list of added items.
 *
 * Photo handling: this repo has no file upload / object storage configured
 * (no Supabase Storage bucket, no upload API — see PLAN.md). Rather than
 * fake a working upload or silently drop the "attach a photo" interaction
 * the design calls for, this reads the chosen file client-side with
 * FileReader.readAsDataURL — exactly like the design mock's own
 * `onPhotoFile` handler (design/raw/Catalog Builder.dc.html) — so the photo
 * shows up immediately here and in the Step 2 live preview. The resulting
 * data: URL is only ever persisted to Supabase if it's small (the publish
 * step in src/app/new/actions.ts / BuilderClient enforces a ~200KB cap,
 * since `catalog_items.image` is a plain `text` column, not object storage,
 * and stuffing large base64 blobs into Postgres rows is bad practice) —
 * oversized photos are dropped at publish time with an inline warning
 * rather than blocking the item.
 */
export function StepItems({ items, currency, onAdd, onRemove }: StepItemsProps) {
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftImage, setDraftImage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function onPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraftImage(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function submit() {
    const name = draftName.trim();
    if (!name) return;
    const price = parseFloat(draftPrice) || 0;
    onAdd({ name, price, image: draftImage });
    setDraftName("");
    setDraftPrice("");
    setDraftImage("");
  }

  return (
    <div>
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[38px]">
        What are you selling?
      </h1>
      <p className="mt-3 max-w-[520px] text-[15px] leading-[1.5] text-[#6e6e73] sm:text-[16px]">
        A name and a price is enough. Add a photo if you have one — you can do the rest later.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2.5 rounded-2xl border border-[#e8e8ed] bg-white p-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a photo"
          className="h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-xl border border-dashed border-[#c7c7cc] bg-[#fbfbfd] p-0 text-[11px] text-[#6e6e73]"
        >
          {draftImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draftImage} alt="" className="h-full w-full object-contain" />
          ) : (
            <span>Photo</span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPhotoFile}
          className="hidden"
        />
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Item name"
          className="min-w-[160px] flex-[2] border-none p-2.5 text-base outline-none"
        />
        <input
          value={draftPrice}
          onChange={(e) => setDraftPrice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          inputMode="decimal"
          placeholder="Price"
          className="min-w-[90px] flex-1 border-none border-l border-[#e8e8ed] p-2.5 px-3 text-base outline-none"
        />
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-[10px] bg-[#1d1d1f] px-5 py-3.5 text-sm font-medium text-white sm:w-auto"
        >
          Add
        </button>
      </div>
      <p className="mt-2.5 text-[13px] text-[#86868b]">
        Tap the square to attach a photo — camera on a phone, file on a computer.
      </p>

      <div className="mt-6 flex flex-col">
        {items.map((it) => (
          <div
            key={it.tempId}
            className="flex items-center gap-3 border-t border-[#f0f0f4] py-3"
          >
            <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-[10px] border border-[#e8e8ed] bg-[#f5f5f7]">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" className="h-full w-full object-contain" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#1d1d1f]">{it.name}</p>
              <p className="mt-0.5 text-xs text-[#86868b]">
                ITEM-{items.indexOf(it) + 1}
              </p>
            </div>
            <span className="flex-shrink-0 text-sm font-medium text-[#1d1d1f]">
              {currency} {it.price.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(it.tempId)}
              aria-label="Remove item"
              className="flex-shrink-0 border-none bg-transparent text-lg text-[#86868b]"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm font-medium text-[#1d1d1f]">
        {items.length} {items.length === 1 ? "item" : "items"} added
      </p>
    </div>
  );
}
