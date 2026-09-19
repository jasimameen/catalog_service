import { headers } from "next/headers";
import Link from "next/link";
import { CompanyContact } from "@/components/brand/CompanyContact";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MONTHLY_PRICE_LABEL, TRIAL_DAYS } from "@/lib/billing/plan";
import { countryFromRequestHeaders } from "@/lib/inquiries/countries";
import { SetupInquiryForm } from "./SetupInquiryForm";

export const metadata = {
  title: "We’ll set it up for you — HV Instant Catalog",
  description: "Send your menu, logo, and how to reach you. We publish your catalog and write back.",
};

export default async function SetupPage() {
  const suggestedCountry = countryFromRequestHeaders(await headers());

  return (
    <div className="min-h-screen bg-[var(--cat-bg)] text-[var(--cat-ink)]">
      <MarketingHeader />
      <main className="mx-auto grid max-w-[1040px] grid-cols-1 gap-10 px-5 pb-20 pt-12 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:pt-16">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-accent)]">
            We’ll set it up
          </p>
          <h1 className="font-catalog-display mt-3 text-balance text-[clamp(32px,5vw,48px)] font-semibold leading-[1.08] tracking-tight">
            Same product. We build the first version.
          </h1>
          <p className="mt-4 text-pretty text-[17px] leading-relaxed text-[var(--cat-muted)]">
            Send the menu, a logo if you have one, and how to reach you. We set the dashboard —
            catalog, QR, dine-in, reserve, orders — then hand it to you.
          </p>
          <ul className="mt-6 flex flex-col gap-2.5 text-[15px] text-[var(--cat-ink)]">
            <li>You send menu, logo, and contact</li>
            <li>We set the dashboard and write back</li>
            <li>
              Same plan as doing it yourself: {TRIAL_DAYS} days free, then {MONTHLY_PRICE_LABEL}
            </li>
          </ul>
          <p className="mt-6 text-[14px] text-[var(--cat-muted)]">
            Concierge is the on-ramp, not a second price. Restaurants can hide reserve later in
            settings if they don’t want it.
          </p>
          <CompanyContact className="mt-5 text-[14px] text-[var(--cat-muted)]" />
          <p className="mt-3 text-[14px]">
            Prefer the dashboard today?{" "}
            <Link href="/auth/sign-up" className="font-medium text-[var(--cat-accent)]">
              Do it yourself
            </Link>
            .
          </p>
        </div>
        <SetupInquiryForm suggestedCountry={suggestedCountry} />
      </main>
      <MarketingFooter />
    </div>
  );
}
