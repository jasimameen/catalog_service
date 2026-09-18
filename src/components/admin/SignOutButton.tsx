"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({
  variant = "default",
  compact = false,
}: {
  variant?: "default" | "nav" | "chrome";
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  const className =
    variant === "nav"
      ? `flex min-h-11 shrink-0 cursor-pointer items-center rounded-[9px] text-[14px] font-normal text-[#5a6472] hover:bg-[#f0f2f6] hover:text-[var(--cat-ink)] disabled:opacity-50 ${
          compact ? "w-11 justify-center px-0" : "w-full px-3 text-left"
        }`
      : variant === "chrome"
        ? "inline-flex min-h-11 shrink-0 cursor-pointer touch-manipulation items-center rounded-[10px] border border-[#e2e7ee] bg-white px-3 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50"
        : "min-h-11 cursor-pointer rounded-[10px] border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      title={compact ? (loading ? "Logging out…" : "Log out") : undefined}
      aria-label={compact ? (loading ? "Logging out" : "Log out") : undefined}
    >
      {compact && variant === "nav" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M6.2 3.2H3.8A.8.8 0 0 0 3 4v8a.8.8 0 0 0 .8.8h2.4M8.4 8H13M10.8 5.6 13.2 8l-2.4 2.4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : loading ? (
        "Logging out…"
      ) : (
        "Log out"
      )}
    </button>
  );
}
