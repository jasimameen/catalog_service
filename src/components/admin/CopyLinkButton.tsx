"use client";

import { useState } from "react";

export function CopyLinkButton({
  url,
  label = "Copy link",
  className,
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy this catalog link", url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this catalog link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-[13px] font-medium text-[var(--cat-ink)]"
      }
    >
      {copied ? "Copied" : label}
    </button>
  );
}
