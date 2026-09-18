"use client";

import { useEffect, useState } from "react";

type MarqueeTone = "ink" | "accent" | "soft";

const TONE: Record<MarqueeTone, string> = {
  ink: "bg-[var(--cat-ink)] text-white",
  accent: "bg-[var(--cat-accent)] text-white",
  soft: "border-b border-[var(--cat-border)] bg-[var(--cat-photo-bg)] text-[var(--cat-ink)]",
};

export function StorefrontMarquee({
  text,
  tone = "ink",
}: {
  text: string;
  tone?: MarqueeTone;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const copy = text.replace(/\s+/g, " ").trim();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!copy) return null;

  if (reduceMotion) {
    return (
      <div role="status" className={`px-4 py-2 text-left text-[13px] font-semibold ${TONE[tone]}`}>
        {copy}
      </div>
    );
  }

  return (
    <div role="status" className={`overflow-hidden ${TONE[tone]}`}>
      <div className="flex w-max animate-cat-marquee py-2 text-[13px] font-semibold tracking-[0.01em]">
        <span className="shrink-0 whitespace-nowrap px-16">{copy}</span>
        <span className="shrink-0 whitespace-nowrap px-16" aria-hidden>
          {copy}
        </span>
      </div>
    </div>
  );
}
