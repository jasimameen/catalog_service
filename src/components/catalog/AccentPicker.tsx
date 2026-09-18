"use client";

import { useEffect, useState } from "react";
import { ACCENT_COLORS, parseAccentHex } from "@/lib/catalog/templates";

export function AccentPicker({
  value,
  onChange,
  name,
  size = "admin",
}: {
  value: string;
  onChange: (hex: string) => void;
  name?: string;
  size?: "admin" | "builder";
}) {
  const current = parseAccentHex(value) ?? ACCENT_COLORS[0]!;
  const [draft, setDraft] = useState(current);
  const swatches = ACCENT_COLORS.some((hex) => hex.toLowerCase() === current.toLowerCase())
    ? ACCENT_COLORS
    : [...ACCENT_COLORS, current];
  const compact = size === "builder";

  useEffect(() => {
    setDraft(current);
  }, [current]);

  function pick(hex: string) {
    const next = parseAccentHex(hex);
    if (!next) return;
    setDraft(next);
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {name ? <input type="hidden" name={name} value={current} /> : null}
      {swatches.map((hex) => {
        const on = current.toLowerCase() === hex.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            aria-label={`Accent ${hex}`}
            aria-pressed={on}
            onClick={() => pick(hex)}
            className={compact ? "h-[34px] w-[34px] rounded-full" : "h-11 w-11 rounded-xl border-2"}
            style={
              compact
                ? {
                    background: hex,
                    border: `2px solid ${on ? "#1d1d1f" : "transparent"}`,
                    boxShadow: "0 0 0 2px #fff inset",
                  }
                : {
                    background: hex,
                    borderColor: on ? "#101720" : "transparent",
                  }
            }
          />
        );
      })}
      <label className="flex items-center gap-2">
        <input
          type="color"
          value={current}
          onChange={(e) => pick(e.target.value)}
          aria-label="Custom accent colour"
          className={
            compact
              ? "h-[34px] w-[34px] cursor-pointer rounded-full border border-[#d2d2d7] bg-white p-0.5"
              : "h-11 w-11 cursor-pointer rounded-xl border border-[#e2e7ee] bg-white p-1"
          }
        />
        <input
          type="text"
          value={draft}
          spellCheck={false}
          maxLength={7}
          aria-label="Accent hex"
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw.startsWith("#") || raw === "" ? raw : `#${raw}`);
            const next = parseAccentHex(raw);
            if (next) onChange(next);
          }}
          onBlur={() => setDraft(current)}
          className={
            compact
              ? "h-[34px] w-[92px] rounded-lg border border-[#d2d2d7] px-2 font-mono text-[12px] outline-none"
              : "h-11 w-[96px] rounded-[10px] border border-[#e2e7ee] px-2.5 font-mono text-[13px] outline-none"
          }
        />
      </label>
    </div>
  );
}
