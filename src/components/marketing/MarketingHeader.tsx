import Link from "next/link";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { PRODUCT_DOMAIN, PRODUCT_NAME } from "@/lib/brand";

type MarketingHeaderProps = {
  /** Homepage keeps in-page anchors; other pages point those sections at `/`. */
  variant?: "home" | "inner";
};

export function MarketingHeader({ variant = "inner" }: MarketingHeaderProps) {
  const templatesHref = variant === "home" ? "#templates" : "/templates";
  const howHref = variant === "home" ? "#how" : "/#how";
  const pricingHref = variant === "home" ? "#pricing" : "/#pricing";

  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/[0.82] backdrop-blur-xl">
      <nav className="mx-auto flex h-[52px] max-w-[1120px] items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <CatalogLogo size={28} />
          <span className="text-[15px] font-semibold tracking-tight">{PRODUCT_NAME}</span>
          <span className="hidden text-xs text-[#86868b] sm:inline">{PRODUCT_DOMAIN}</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href={templatesHref} className="hidden text-xs sm:inline">
            Templates
          </Link>
          <a href={howHref} className="hidden text-xs sm:inline">
            How it works
          </a>
          <a href={pricingHref} className="hidden text-xs sm:inline">
            Pricing
          </a>
          <Link href="/auth/sign-in" className="text-xs">
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-full bg-[var(--cat-accent)] px-3.5 py-1.5 text-xs font-medium text-white"
          >
            Start free
          </Link>
        </div>
      </nav>
    </header>
  );
}
