"use client";

import { useState } from "react";
import { MONTHLY_PRICE_LABEL } from "@/lib/billing/plan";

export function SubscribeButton({
  configured,
  variant = "settings",
}: {
  configured: boolean;
  variant?: "settings" | "nav" | "solid";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!configured || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout.");
      setPending(false);
    }
  }

  const label = pending ? "Redirecting…" : `Subscribe · ${MONTHLY_PRICE_LABEL}`;
  const disabled = !configured || pending;

  const className =
    variant === "nav"
      ? "block w-full rounded-lg border border-[#d2d2d7] bg-white py-1.5 text-center text-xs font-medium text-[var(--cat-ink)] disabled:cursor-not-allowed disabled:opacity-60"
      : variant === "solid"
        ? "rounded-full bg-[var(--cat-ink)] px-5 py-2.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        : "rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-[var(--cat-ink)] disabled:cursor-not-allowed disabled:opacity-60";
  const errorClass = variant === "settings" ? "text-[#ff8a80]" : "text-[#b2432b]";

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        title={configured ? undefined : "Billing isn't configured"}
        onClick={startCheckout}
        className={className}
      >
        {configured ? label : "Billing isn't configured"}
      </button>
      {error ? <p className={`m-0 mt-2 text-xs ${errorClass}`}>{error}</p> : null}
    </div>
  );
}
