"use client";

import type { ItemOptionGroup } from "@/lib/supabase/types";

export function ItemOptionsEditor({
  options,
  onChange,
}: {
  options: ItemOptionGroup[];
  onChange: (options: ItemOptionGroup[]) => void;
}) {
  function updateGroup(index: number, patch: Partial<ItemOptionGroup>) {
    onChange(options.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  }

  function updateValue(groupIndex: number, valueIndex: number, name: string, price_delta: number) {
    onChange(
      options.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          values: group.values.map((value, j) =>
            j === valueIndex ? { name, price_delta } : value,
          ),
        };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-xs font-medium text-[var(--cat-muted)]">
          Options / variants
        </p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...options,
              { name: options.length === 0 ? "Size" : "Extras", type: options.length === 0 ? "single" : "multi", required: options.length === 0, values: [{ name: "", price_delta: 0 }] },
            ])
          }
          className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-3 text-xs font-medium text-[var(--cat-ink)]"
        >
          Add option group
        </button>
      </div>
      {options.length === 0 ? (
        <p className="m-0 text-xs text-[#86868b]">
          Leave empty for a single price. Add Size (S/M/L) or extras with a price difference.
        </p>
      ) : null}
      {options.map((group, groupIndex) => (
        <div key={groupIndex} className="rounded-[12px] border border-[#e8e8ed] p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={group.name}
              onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
              placeholder="Size"
              className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-3 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
            <select
              value={group.type}
              onChange={(e) =>
                updateGroup(groupIndex, { type: e.target.value === "multi" ? "multi" : "single" })
              }
              className="min-h-11 rounded-[10px] border border-[#d2d2d7] bg-white px-3 text-[13px] outline-none"
            >
              <option value="single">One choice</option>
              <option value="multi">Extras</option>
            </select>
          </div>
          <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-[var(--cat-muted)]">
            <input
              type="checkbox"
              checked={group.required}
              onChange={(e) => updateGroup(groupIndex, { required: e.target.checked })}
            />
            Required
          </label>
          <div className="mt-2 flex flex-col gap-2">
            {group.values.map((value, valueIndex) => (
              <div key={valueIndex} className="grid grid-cols-[1fr_90px_36px] gap-2">
                <input
                  value={value.name}
                  onChange={(e) =>
                    updateValue(groupIndex, valueIndex, e.target.value, value.price_delta)
                  }
                  placeholder={group.type === "single" ? "Large" : "Extra cheese"}
                  className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-3 text-[13px] outline-none focus:border-[var(--cat-accent)]"
                />
                <input
                  type="number"
                  step="0.01"
                  value={value.price_delta}
                  onChange={(e) =>
                    updateValue(groupIndex, valueIndex, value.name, Number(e.target.value) || 0)
                  }
                  className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
                  aria-label="Price difference"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateGroup(groupIndex, {
                      values: group.values.filter((_, i) => i !== valueIndex),
                    })
                  }
                  className="min-h-11 text-lg text-[#86868b]"
                  aria-label="Remove value"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() =>
                updateGroup(groupIndex, {
                  values: [...group.values, { name: "", price_delta: 0 }],
                })
              }
              className="min-h-11 text-xs font-medium text-[var(--cat-accent)]"
            >
              Add value
            </button>
            <button
              type="button"
              onClick={() => onChange(options.filter((_, i) => i !== groupIndex))}
              className="min-h-11 text-xs font-medium text-[#b2432b]"
            >
              Remove group
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
