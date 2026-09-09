"use client";

import Link from "next/link";
import { useState } from "react";

interface PublishedScreenProps {
  liveUrl: string;
  catalogId: string;
}

/** Success screen shown once publishCatalog() returns ok. */
export function PublishedScreen({ liveUrl, catalogId }: PublishedScreenProps) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — the pill
      // still shows the URL to copy by hand.
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ url: liveUrl, title: "My catalog" });
    } catch {
      // User cancelled the share sheet, or share failed — nothing to do.
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-[520px] text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#dff5e6] text-[26px] text-[#1e9e4a]">
          ✓
        </div>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
          Your catalog is live.
        </h1>
        <p className="mt-3.5 text-[16px] leading-[1.5] text-[#6e6e73] sm:text-[17px]">
          Send this link to your customers. Every order comes back to your inbox and dashboard.
        </p>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#e8e8ed] bg-white p-3.5">
          <span className="flex-1 truncate text-left text-[15px] font-semibold tracking-[-0.01em]">
            {liveUrl}
          </span>
          <button
            type="button"
            onClick={copyLink}
            className="flex-shrink-0 rounded-lg bg-[#1d1d1f] px-3.5 py-2 text-xs font-medium text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-3 flex flex-col justify-center gap-2.5 sm:flex-row">
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#d2d2d7] px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f]"
          >
            Open catalog
          </a>
          {canShare ? (
            <button
              type="button"
              onClick={shareLink}
              className="rounded-full border border-[#d2d2d7] px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f]"
            >
              Share link
            </button>
          ) : null}
          <Link
            href={`/admin/${catalogId}`}
            className="rounded-full bg-[#0b5fce] px-5 py-2.5 text-[13px] font-medium text-white"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
