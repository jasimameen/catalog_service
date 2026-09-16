"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ variant = "default" }: { variant?: "default" | "nav" | "chrome" }) {
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
      ? "flex min-h-11 w-full shrink-0 cursor-pointer items-center rounded-[9px] px-3 text-left text-[14px] font-normal text-[#5a6472] hover:bg-[#f0f2f6] hover:text-[var(--cat-ink)] disabled:opacity-50"
      : variant === "chrome"
        ? "inline-flex min-h-11 shrink-0 cursor-pointer touch-manipulation items-center rounded-[10px] border border-[#e2e7ee] bg-white px-3 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50"
        : "min-h-11 cursor-pointer rounded-[10px] border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50";

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
