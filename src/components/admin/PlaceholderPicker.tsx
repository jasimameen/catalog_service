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
      <div className="flex flex-wrap gap-2">
        {STOCK_PHOTOS.map((photo) => {
          const selected = value.startsWith(photo.url.split("?")[0]!);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onSelect(selected ? "" : photo.url)}
              title={photo.label}
              className={`h-[54px] w-[54px] overflow-hidden rounded-[10px] border-2 ${
                selected ? "border-[#0b5fce]" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- curated Unsplash thumbs */}
              <img src={photo.thumb} alt={photo.label} className="h-full w-full object-cover" />
            </button>
          );
        })}
      </div>
      <p className="m-0 mt-2 text-[12px] text-[#8a93a2]">Photos via Unsplash. Click again to clear.</p>
    </div>
  );
}
