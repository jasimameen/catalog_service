"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ variant = "default" }: { variant?: "default" | "nav" }) {
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
      ? "flex shrink-0 items-center rounded-lg px-2.5 py-2 text-left text-[13px] font-normal text-[#424245] hover:bg-white/60 disabled:opacity-50 md:w-full"
      : "rounded-[10px] border border-[#d2d2d7] bg-white px-4 py-2.5 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50";

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
