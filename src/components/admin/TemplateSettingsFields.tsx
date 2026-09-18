"use client";

import type { CatalogTemplate } from "@/lib/supabase/types";
import type { TemplateSettings } from "@/lib/catalog/template-settings";
import { dashHint, dashInput, dashKicker, dashLabel } from "@/components/admin/dashboard/styles";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3.5 text-[13px] has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#eef4fd]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#0b5fce]"
      />
      {label}
    </label>
  );
}

export function TemplateSettingsFields({
  template,
  settings,
  onChange,
}: {
  template: CatalogTemplate;
  settings: TemplateSettings;
  onChange: (next: TemplateSettings) => void;
}) {
  if (template === "grid") {
    const g = settings.grid;
    return (
      <div className="flex flex-col gap-2.5">
        <p className={dashKicker}>Trade Grid</p>
        <p className={dashHint}>Columns, codes and quantity steppers for this layout only.</p>
        <div className="flex flex-wrap gap-2">
          {([2, 3, 4] as const).map((n) => (
            <label
              key={n}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#e2e7ee] px-3.5 text-[13px] has-[:checked]:border-[#101720] has-[:checked]:bg-[#101720] has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="gridCols"
                checked={g.columns === n}
                onChange={() => onChange({ ...settings, grid: { ...g, columns: n } })}
              />
              {n} columns
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Toggle label="Show item codes" checked={g.showCodes} onChange={(v) => onChange({ ...settings, grid: { ...g, showCodes: v } })} />
          <Toggle label="Quantity steppers" checked={g.qtySteppers} onChange={(v) => onChange({ ...settings, grid: { ...g, qtySteppers: v } })} />
        </div>
      </div>
    );
  }

  if (template === "menu") {
    const m = settings.menu;
    return (
      <div className="flex flex-col gap-2.5">
        <p className={dashKicker}>Restaurant Menu layout</p>
        <div className="flex flex-wrap gap-2">
          <Toggle label="Show photos" checked={m.showPhotos} onChange={(v) => onChange({ ...settings, menu: { ...m, showPhotos: v } })} />
          <Toggle label="Diet filters" checked={m.dietFilters} onChange={(v) => onChange({ ...settings, menu: { ...m, dietFilters: v } })} />
          <Toggle label="Sort options" checked={m.sorts} onChange={(v) => onChange({ ...settings, menu: { ...m, sorts: v } })} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["cards", "rows"] as const).map((style) => (
            <label
              key={style}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#e2e7ee] px-3.5 text-[13px] has-[:checked]:border-[#101720] has-[:checked]:bg-[#101720] has-[:checked]:text-white"
            >
              <input
                type="radio"
                checked={m.sectionStyle === style}
                onChange={() => onChange({ ...settings, menu: { ...m, sectionStyle: style } })}
              />
              {style === "cards" ? "Cards" : "Rows"}
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={dashLabel}>Featured title</span>
          <input
            value={m.featuredTitle}
            onChange={(e) => onChange({ ...settings, menu: { ...m, featuredTitle: e.target.value } })}
            className={dashInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={dashLabel}>Featured note</span>
          <input
            value={m.featuredNote}
            onChange={(e) => onChange({ ...settings, menu: { ...m, featuredNote: e.target.value } })}
            className={dashInput}
          />
        </label>
      </div>
    );
  }

  if (template === "lookbook") {
    const l = settings.lookbook;
    return (
      <div className="flex flex-wrap gap-2">
        <Toggle label="Show prices" checked={l.showPrices} onChange={(v) => onChange({ ...settings, lookbook: { ...l, showPrices: v } })} />
        <Toggle label="Show descriptions" checked={l.showDescriptions} onChange={(v) => onChange({ ...settings, lookbook: { ...l, showDescriptions: v } })} />
      </div>
    );
  }

  if (template === "cards") {
    const c = settings.cards;
    return (
      <div className="flex flex-wrap gap-2">
        <Toggle label="Show description" checked={c.showDescription} onChange={(v) => onChange({ ...settings, cards: { ...c, showDescription: v } })} />
        <Toggle label="Show codes" checked={c.showCodes} onChange={(v) => onChange({ ...settings, cards: { ...c, showCodes: v } })} />
      </div>
    );
  }

  if (template === "compact") {
    const c = settings.compact;
    return (
      <div className="flex flex-wrap gap-2">
        <Toggle label="Show codes" checked={c.showCodes} onChange={(v) => onChange({ ...settings, compact: { ...c, showCodes: v } })} />
        <Toggle label="Quantity steppers" checked={c.qtySteppers} onChange={(v) => onChange({ ...settings, compact: { ...c, qtySteppers: v } })} />
      </div>
    );
  }

  if (template === "spotlight") {
    const s = settings.spotlight;
    return (
      <div className="flex flex-wrap gap-2">
        <Toggle label="Show hero item" checked={s.showHero} onChange={(v) => onChange({ ...settings, spotlight: { ...s, showHero: v } })} />
        <Toggle label="Show codes" checked={s.showCodes} onChange={(v) => onChange({ ...settings, spotlight: { ...s, showCodes: v } })} />
      </div>
    );
  }

  const p = settings.pricelist;
  return (
    <div className="flex flex-wrap gap-2">
      <Toggle label="Show codes" checked={p.showCodes} onChange={(v) => onChange({ ...settings, pricelist: { ...p, showCodes: v } })} />
      <Toggle label="Compact rows" checked={p.compactRows} onChange={(v) => onChange({ ...settings, pricelist: { ...p, compactRows: v } })} />
    </div>
  );
}
