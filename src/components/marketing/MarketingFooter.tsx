import Link from "next/link";
import { CompanyContact } from "@/components/brand/CompanyContact";
import { COMPANY_NAME, COMPANY_URL } from "@/lib/brand";

type MarketingFooterProps = {
  variant?: "home" | "inner";
};

export function MarketingFooter({ variant = "inner" }: MarketingFooterProps) {
  return (
    <footer className="border-t border-[var(--cat-border)] bg-[var(--cat-surface)] px-6 pb-16 pt-10">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--cat-muted)]">
            <a
              href={COMPANY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--cat-ink)] hover:underline"
            >
              Powered by {COMPANY_NAME}
            </a>
            <span> · Made for people who sell from a list.</span>
          </p>
          <CompanyContact className="text-xs text-[var(--cat-muted)]" />
        </div>
        <div className="flex gap-5 text-xs">
          {variant === "home" ? (
            <>
              <Link href="/live">See it live</Link>
              <a href="#templates">Templates</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">Questions</a>
              <Link href="/setup">We’ll set it up</Link>
            </>
          ) : (
            <>
              <Link href="/live">See it live</Link>
              <Link href="/templates">Templates</Link>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/#faq">Questions</Link>
              <Link href="/setup">We’ll set it up</Link>
            </>
          )}
          <Link href="/admin">Dashboard</Link>
        </div>
      </div>
    </footer>
  );
}
