import Link from "next/link";
import { COMPANY_NAME, COMPANY_URL, CONTACT_EMAIL } from "@/lib/brand";

type MarketingFooterProps = {
  variant?: "home" | "inner";
};

export function MarketingFooter({ variant = "inner" }: MarketingFooterProps) {
  return (
    <footer className="border-t border-[#e8e8ed] bg-white px-6 pb-16 pt-10">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-[#86868b]">
          <a
            href={COMPANY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#1d1d1f] hover:underline"
          >
            Powered by {COMPANY_NAME}
          </a>
          <span> · </span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
            Questions? {CONTACT_EMAIL}
          </a>
          <span> · Made for people who sell from a list.</span>
        </p>
        <div className="flex gap-5 text-xs">
          {variant === "home" ? (
            <>
              <a href="#templates">Templates</a>
              <a href="#pricing">Pricing</a>
            </>
          ) : (
            <>
              <Link href="/templates">Templates</Link>
              <Link href="/#pricing">Pricing</Link>
            </>
          )}
          <Link href="/admin">Dashboard</Link>
        </div>
      </div>
    </footer>
  );
}
