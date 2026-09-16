"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { darken } from "@/lib/catalog/color";
import { buildLookPreviewCatalog } from "@/lib/catalog/preview-dummy";
import type { CatalogTemplateKey } from "@/lib/catalog/types";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";

const PHONE_WIDTH = 390;

interface TemplatePreviewProps {
  template: CatalogTemplateKey;
  accent: string;
  catalogName: string;
  currency: string;
  liveUrl: string;
}

/**
 * Builder Look preview — real template renderers with a fixed dummy catalog
 * (items are added after publish). Fills the right pane; templates use
 * container queries so a ~500px+ pane shows desktop columns. Phone frame
 * is opt-in via the chrome toggle (and is the natural width when the
 * wizard stacks on small screens).
 */
export function TemplatePreview({
  template,
  accent,
  catalogName,
  currency,
  liveUrl,
}: TemplatePreviewProps) {
  const [frame, setFrame] = useState<"desktop" | "phone">("desktop");

  const catalog = useMemo(
    () =>
      buildLookPreviewCatalog({
        name: catalogName,
        template,
        accent,
        currency,
      }),
    [catalogName, template, accent, currency],
  );

  const theme = {
    "--cat-accent": accent,
    "--cat-accent-dark": darken(accent),
  } as CSSProperties;

  const phone = frame === "phone";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-white shadow-[0_24px_48px_-28px_rgba(0,0,0,0.4)] ${
          phone ? "mx-auto w-full rounded-[18px]" : "w-full rounded-[18px]"
        }`}
        style={phone ? { maxWidth: PHONE_WIDTH } : undefined}
      >
        <div className="flex items-center gap-2 border-b border-[#e8e8ed] bg-[#fbfbfd] px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-[11px] text-[#6e6e73]">{liveUrl || "your-shop.example"}</p>
          <div className="hidden shrink-0 rounded-full border border-[#e8e8ed] bg-white p-0.5 md:flex">
            <FrameTab label="Desktop" active={!phone} onClick={() => setFrame("desktop")} />
            <FrameTab label="Phone" active={phone} onClick={() => setFrame("phone")} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div style={theme} className="@container pointer-events-none select-none bg-white">
            <StorefrontApp catalog={catalog} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FrameTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{
        background: active ? "#1d1d1f" : "transparent",
        color: active ? "#ffffff" : "#6e6e73",
      }}
    >
      {label}
    </button>
  );
}
