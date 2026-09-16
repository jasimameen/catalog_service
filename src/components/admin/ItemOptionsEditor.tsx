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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[13px] font-semibold text-[#101720]">Options / variants</p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...options,
              {
                name: options.length === 0 ? "Size" : "Extras",
                type: options.length === 0 ? "single" : "multi",
                required: options.length === 0,
                values: [],
              },
            ])
          }
          className="min-h-10 rounded-[10px] border border-dashed border-[#c3ccd9] bg-white px-3.5 text-[13px] text-[#101720] hover:border-[#0b5fce] hover:text-[#0b5fce]"
        >
          Add option group
        </button>
      </div>
      {options.length === 0 ? (
        <p className="m-0 text-[13px] leading-snug text-[#8a93a2]">
          Leave empty for a single price. Add Size (S/M/L) or extras with a price difference.
        </p>
      ) : null}
      {options.map((group, groupIndex) => {
        const withDelta = group.values.filter((value) => Number(value.price_delta) > 0);
        return (
          <div
            key={groupIndex}
            className="flex flex-col gap-2.5 rounded-xl border border-[#e2e7ee] bg-[#fbfbfd] p-3"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                value={group.name}
                onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                placeholder="Group name"
                className="min-h-10 min-w-0 flex-1 basis-[150px] rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[14px] outline-none focus:border-[#0b5fce]"
              />
              <select
                value={group.type}
                onChange={(e) =>
                  updateGroup(groupIndex, { type: e.target.value === "multi" ? "multi" : "single" })
                }
                className="min-h-10 flex-[0_1_140px] rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px] outline-none"
              >
                <option value="single">One choice</option>
                <option value="multi">Extras</option>
              </select>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) => updateGroup(groupIndex, { required: e.target.checked })}
                  className="h-4 w-4 accent-[#0b5fce]"
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => onChange(options.filter((_, i) => i !== groupIndex))}
                className="min-h-10 rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px] text-[#b42318]"
              >
                Remove group
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {group.values.map((value, valueIndex) => (
                <div key={valueIndex} className="flex items-center gap-2">
                  <input
                    value={value.name}
                    onChange={(e) =>
                      updateValue(groupIndex, valueIndex, e.target.value, value.price_delta)
                    }
                    placeholder={group.type === "single" ? "Value" : "Extra"}
                    className="min-h-10 min-w-0 flex-1 basis-[140px] rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[14px] outline-none focus:border-[#0b5fce]"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={value.price_delta}
                    onChange={(e) =>
                      updateValue(groupIndex, valueIndex, value.name, Number(e.target.value) || 0)
                    }
                    placeholder="Price difference"
                    className="h-10 w-[130px] shrink-0 rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[14px] outline-none focus:border-[#0b5fce]"
                    aria-label="Price difference"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateGroup(groupIndex, {
                        values: group.values.filter((_, i) => i !== valueIndex),
                      })
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e2e7ee] bg-white text-[#5a6472]"
                    aria-label="Remove value"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateGroup(groupIndex, {
                    values: [...group.values, { name: "", price_delta: 0 }],
                  })
                }
                className="min-h-[38px] self-start rounded-[10px] border border-[#e2e7ee] bg-white px-3 text-[13px] hover:border-[#c3ccd9]"
              >
                Add value
              </button>
            </div>

            {group.values.length > 0 ? (
              <div className="flex flex-col gap-1.5 border-t border-dashed border-[#dfe4ec] pt-2.5">
                <p className="m-0 text-[11px] uppercase tracking-[0.07em] text-[#8a93a2]">
                  Storefront
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.values.map((value, valueIndex) => (
                    <span
                      key={`${value.name}-${valueIndex}`}
                      className="rounded-full border border-[#dfe4ec] bg-white px-3 py-1.5 text-[13px]"
                    >
                      {value.name || "—"}
                    </span>
                  ))}
                </div>
                <p className="m-0 text-[12px] text-[#8a93a2]">
                  {withDelta.length
                    ? `Price differences show next to the price: ${withDelta
                        .map((value) => `${value.name} +${Number(value.price_delta).toFixed(2)}`)
                        .join(", ")}`
                    : "Chips show the variant name only."}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
