"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { PRODUCT_NAME } from "@/lib/brand";

type MarketingHeaderProps = {
  /** Homepage keeps in-page anchors; other pages point those sections at `/`. */
  variant?: "home" | "inner";
};

export function MarketingHeader({ variant = "inner" }: MarketingHeaderProps) {
  const opsHref = variant === "home" ? "#ops" : "/#ops";
  const floorHref = variant === "home" ? "#floor" : "/#floor";
  const pricingHref = variant === "home" ? "#pricing" : "/#pricing";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-30">
      <div className="mkt-glass relative">
        <nav className="mx-auto flex h-[3.25rem] max-w-[70rem] items-center justify-between gap-4 px-5 sm:px-6">
          <Link href="/" className="mkt-press flex items-center gap-2.5 text-[var(--cat-ink)]">
            <CatalogLogo size={28} />
            <span className="text-[0.9375rem] font-semibold tracking-tight">{PRODUCT_NAME}</span>
          </Link>
          <div className="flex items-center gap-4 text-[0.8125rem] font-medium text-[var(--cat-ink)] sm:gap-5">
            <a href={opsHref} className="mkt-press hidden sm:inline">
              Ops
            </a>
            <a href={floorHref} className="mkt-press hidden sm:inline">
              Floor
            </a>
            <a href={pricingHref} className="mkt-press hidden sm:inline">
              Pricing
            </a>
            <Link href="/auth/sign-in" className="mkt-press">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="mkt-btn-primary mkt-btn-sm">
              Start free
            </Link>
          </div>
        </nav>
        {scrolled ? <div className="mkt-edge" aria-hidden /> : null}
      </div>
    </header>
  );
}
