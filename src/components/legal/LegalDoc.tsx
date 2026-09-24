import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--cat-surface)] text-[var(--cat-ink)]">
      <MarketingHeader />
      <article className="mx-auto max-w-[40rem] px-5 py-12 sm:px-6 sm:py-16">
        <p className="m-0 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[var(--cat-muted)]">
          {updated}
        </p>
        <h1 className="mt-2 text-[2rem] font-semibold tracking-tight">{title}</h1>
        <div className="legal-doc mt-8 space-y-5 text-[0.9375rem] leading-relaxed text-[var(--cat-muted)] [&_h2]:mt-8 [&_h2]:text-[1.0625rem] [&_h2]:font-semibold [&_h2]:text-[var(--cat-ink)] [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </article>
      <MarketingFooter />
    </div>
  );
}
