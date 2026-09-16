"use client";

import { storefrontCategories } from "@/lib/catalog/merchandising";
import type { StorefrontItem } from "@/lib/catalog/types";

export function CategoryChips({
  items,
  selected,
  onSelect,
}: {
  items: StorefrontItem[];
  selected: string;
  onSelect: (category: string) => void;
}) {
  const categories = storefrontCategories(items);
  if (categories.length < 2) return null;

  return (
    <div className="sticky top-14 z-[9] border-b border-[var(--cat-border)] bg-white/95 backdrop-blur md:static md:top-auto md:z-auto">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
        <Chip active={selected === ""} onClick={() => onSelect("")}>
          All
        </Chip>
        {categories.map((name) => (
          <Chip key={name} active={selected === name} onClick={() => onSelect(name)}>
            {name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium ${
        active
          ? "bg-[var(--cat-accent)] text-white"
          : "bg-[#f5f5f7] text-[var(--cat-ink)]"
      }`}
    >
      {children}
    </button>
  );
}
