"use client";

import { TEMPLATES, ACCENT_COLORS } from "@/lib/catalog/templates";
import type { CatalogTemplateKey } from "./types";

interface StepLookProps {
  template: CatalogTemplateKey;
  accent: string;
  catalogName: string;
  onTemplate: (key: CatalogTemplateKey) => void;
  onAccent: (hex: string) => void;
  onCatalogName: (name: string) => void;
}

/** Step 2 — "Pick a look." Template cards, accent swatches, catalog name. */
export function StepLook({
  template,
  accent,
  catalogName,
  onTemplate,
  onAccent,
  onCatalogName,
}: StepLookProps) {
  return (
    <div>
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[38px]">
        Pick a look.
      </h1>
      <p className="mt-3 max-w-[520px] text-[15px] leading-[1.5] text-[#6e6e73] sm:text-[16px]">
        The preview updates as you choose. Nothing here is permanent.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TEMPLATES.map((tpl) => {
          const selected = template === tpl.key;
          return (
            <button
              key={tpl.key}
              type="button"
              onClick={() => onTemplate(tpl.key)}
              className="rounded-[14px] border-[1.5px] bg-white p-4 text-left"
              style={{
                borderColor: selected ? accent : "#e8e8ed",
                boxShadow: selected ? "0 8px 24px -16px rgba(0,0,0,0.4)" : "none",
              }}
            >
              <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                {tpl.name}
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.45] text-[#6e6e73]">{tpl.blurb}</p>
            </button>
          );
        })}
      </div>

      <p className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        Accent colour
      </p>
      <div className="flex gap-2.5">
        {ACCENT_COLORS.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onAccent(hex)}
            aria-label="Accent colour"
            className="h-[34px] w-[34px] rounded-full"
            style={{
              background: hex,
              border: `2px solid ${accent === hex ? "#1d1d1f" : "transparent"}`,
              boxShadow: "0 0 0 2px #fff inset",
            }}
          />
        ))}
      </div>

      <p className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        Catalog name
      </p>
      <input
        value={catalogName}
        onChange={(e) => onCatalogName(e.target.value)}
        className="w-full max-w-[420px] rounded-xl border border-[#d2d2d7] px-3.5 py-3 text-base outline-none"
      />
    </div>
  );
}
