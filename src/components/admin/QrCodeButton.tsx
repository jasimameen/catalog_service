"use client";

import { useState } from "react";

/**
 * Toggles a small popover with a QR code for the given URL, generated via
 * the public api.qrserver.com endpoint (no API key, no dependency needed).
 * This is a reasonable v1 shortcut — a self-hosted QR generator would avoid
 * the external request but isn't worth adding a new dependency for.
 */
export function QrCodeButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-[13px] font-medium text-[var(--cat-ink)]"
      >
        QR code
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-10 rounded-2xl border border-[var(--cat-border)] bg-white p-3 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- external, non-optimizable QR image */}
          <img src={src} alt={`QR code for ${url}`} width={180} height={180} className="block" />
        </div>
      ) : null}
    </div>
  );
}
