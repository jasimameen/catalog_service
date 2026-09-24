import Link from "next/link";
import { CompanyContact } from "@/components/brand/CompanyContact";
import { LegalLinks } from "@/components/brand/LegalLinks";
import { COMPANY_NAME, COMPANY_URL } from "@/lib/brand";

type MarketingFooterProps = {
  variant?: "home" | "inner";
};

export function MarketingFooter({ variant = "inner" }: MarketingFooterProps) {
  return (
    <footer className="bg-[var(--cat-surface)] px-5 pb-16 pt-10 sm:px-6">
      <div className="mx-auto flex max-w-[70rem] flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[0.75rem] text-[var(--cat-muted)]">
            <a
              href={COMPANY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mkt-press font-medium text-[var(--cat-ink)] hover:underline"
            >
              Powered by {COMPANY_NAME}
            </a>
            <span> · Made for people who sell from a list.</span>
          </p>
          <CompanyContact className="text-[0.75rem] text-[var(--cat-muted)]" />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.75rem] font-medium text-[var(--cat-ink)]">
          {variant === "home" ? (
            <>
              <Link href="/live" className="mkt-press">
                Harbor
              </Link>
              <a href="#ops" className="mkt-press">
                Ops
              </a>
              <a href="#floor" className="mkt-press">
                Floor
              </a>
              <a href="#pricing" className="mkt-press">
                Pricing
              </a>
              <a href="#faq" className="mkt-press">
                Questions
              </a>
              <Link href="/setup" className="mkt-press">
                We’ll set it up
              </Link>
            </>
          ) : (
            <>
              <Link href="/live" className="mkt-press">
                Harbor
              </Link>
              <Link href="/templates" className="mkt-press">
                Templates
              </Link>
              <Link href="/#pricing" className="mkt-press">
                Pricing
              </Link>
              <Link href="/#faq" className="mkt-press">
                Questions
              </Link>
              <Link href="/setup" className="mkt-press">
                We’ll set it up
              </Link>
            </>
          )}
          <Link href="/admin" className="mkt-press">
            Dashboard
          </Link>
          <LegalLinks className="mkt-press" />
        </div>
      </div>
    </footer>
  );
}
