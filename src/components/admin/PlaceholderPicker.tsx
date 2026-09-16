"use client";

import { STOCK_PHOTOS } from "@/lib/catalog/placeholders";

export function PlaceholderPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (url: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-[var(--cat-muted)]">Stock photo</p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {STOCK_PHOTOS.map((photo) => {
          const selected = value.startsWith(photo.url.split("?")[0]!);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onSelect(selected ? "" : photo.url)}
              title={photo.label}
              className={`overflow-hidden rounded-lg border ${
                selected ? "border-[var(--cat-accent)] ring-2 ring-[var(--cat-accent)]/30" : "border-[#e8e8ed]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- curated Unsplash thumbs */}
              <img src={photo.thumb} alt={photo.label} className="aspect-square w-full object-cover" />
            </button>
          );
        })}
      </div>
      <p className="m-0 mt-1 text-[11px] text-[#86868b]">Photos via Unsplash. Click again to clear.</p>
    </div>
  );
}
