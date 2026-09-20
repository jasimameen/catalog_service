import Link from "next/link";
import { HarborPreview } from "@/components/marketing/HarborPreview";
import { JsonLd } from "@/components/marketing/JsonLd";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_USD, TRIAL_DAYS, TRIAL_DAYS_LABEL } from "@/lib/billing/plan";
import { CompanyContact } from "@/components/brand/CompanyContact";
import { PRODUCT_DOMAIN, PRODUCT_NAME_LONG } from "@/lib/brand";
import { TEMPLATES } from "@/lib/catalog/templates";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  MARKETING_FAQS,
  marketingJsonLd,
  marketingMetadata,
} from "@/lib/seo/marketing";

export const metadata = marketingMetadata({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: "/",
});

const PLAN_INCLUDES = [
  "Live menu on your link",
  "Table QR / dine-in",
  "Reservations",
  "Orders to your dashboard",
];

export default function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden bg-[var(--cat-surface)] text-[var(--cat-ink)]">
      <JsonLd data={marketingJsonLd()} />
      <MarketingHeader variant="home" />

      <section className="mx-auto max-w-[1120px] px-5 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mb-4 text-[14px] text-[var(--cat-muted)] sm:text-[15px]">
          <span className="font-medium text-[var(--cat-ink)]">{PRODUCT_NAME_LONG}</span>
          {" · Live catalog for kitchens and shops"}
        </p>
        <h1 className="font-catalog-display mx-auto text-balance text-[clamp(36px,8vw,72px)] font-semibold leading-[1.04] tracking-[-0.035em]">
          Your menu, live.
          <br />
          Guests order from it.
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-pretty text-[clamp(16px,2.4vw,20px)] leading-[1.45] text-[var(--cat-muted)]">
          Instant Catalog is a live catalog guests open on their phone — restaurant QR menu,
          table reservations, pickup and delivery. We can publish it for you, or you set it
          up yourself.
        </p>
        <p className="mt-4 text-[13px] text-[var(--cat-muted)]">
          {TRIAL_DAYS} days free, then {MONTHLY_PRICE_LABEL}.
        </p>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 pt-10 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DoorCard
            kicker="Do it yourself"
            title="You get the dashboard today"
            body={`${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL}. Catalog, QR, dine-in, reserve, and orders are in the dashboard now. Upload the menu and go live.`}
            href="/auth/sign-up"
            cta="Start free"
            primary
          />
          <DoorCard
            kicker="We’ll set it up"
            title="Same product after we build it"
            body={`Send the menu, a logo, and how to reach you. We set the dashboard. You still get ${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL} — concierge is the on-ramp, not a second price.`}
            href="/setup"
            cta="Tell us about the place"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 pt-14 sm:px-6">
        <HarborPreview />
      </section>

      <section id="how" className="mx-auto max-w-[1120px] px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="font-catalog-display text-center text-[clamp(28px,4vw,44px)] font-semibold tracking-tight">
          What you get
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FeatureCard title="Live catalog" body="Guests browse dishes, pick sizes, and send the order. Prices are locked on the server." />
          <FeatureCard title="Dine-in QR" body="A code on the table opens the menu. Send to kitchen. Call waiter. Ask for the bill." />
          <FeatureCard title="Reserve" body="Guests pick a day, a time, and a table. It lands in the same inbox as orders." />
          <FeatureCard title="We build it" body="No photos yet? No time? Send what you have. We publish Harbor-quality for your name." />
        </div>
      </section>

      <section id="templates" className="mx-auto max-w-[1120px] px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="font-catalog-display text-center text-[clamp(28px,4vw,44px)] font-semibold tracking-tight">
          Templates
        </h2>
        <p className="mx-auto mt-3.5 max-w-[560px] text-center text-[16px] leading-relaxed text-[var(--cat-muted)]">
          Restaurant menu is the default for kitchens. Trade catalogs still get Grid and Price List.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((tpl) => (
            <div key={tpl.key} className="overflow-hidden rounded-[20px] border border-[var(--cat-border)] bg-[var(--cat-surface)]">
              <div className="flex aspect-[4/3] items-stretch bg-[var(--cat-bg)] p-4">
                <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-[10px] bg-[var(--cat-surface)] p-3 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.3)]">
                  <div className="h-1.5 w-2/5 rounded-full bg-[var(--cat-ink)]" />
                  <TemplatePreviewBlocks templateKey={tpl.key} />
                </div>
              </div>
              <div className="px-5 pb-5 pt-4">
                <h3 className="text-[16px] font-semibold tracking-tight">{tpl.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--cat-muted)]">{tpl.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1120px] px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="font-catalog-display text-center text-[clamp(28px,4vw,44px)] font-semibold tracking-tight">
          One plan
        </h2>
        <p className="mx-auto mt-3 max-w-[420px] text-center text-[16px] leading-relaxed text-[var(--cat-muted)]">
          One live shop. {TRIAL_DAYS_LABEL}, then {MONTHLY_PRICE_LABEL}.
        </p>
        <div className="mx-auto mt-10 max-w-[460px] rounded-[24px] bg-[var(--cat-ink)] p-8 text-center text-[var(--cat-on-ink)] sm:p-10">
          <p className="text-sm text-[var(--cat-on-ink-muted)]">{TRIAL_DAYS_LABEL}</p>
          <p className="mt-3 text-[56px] font-semibold leading-none tracking-tighter sm:text-[64px]">
            ${MONTHLY_PRICE_USD}
          </p>
          <p className="mt-2 text-[15px] text-[var(--cat-on-ink-muted)]">per month</p>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--cat-on-ink-muted)]">
            Try the live shop. No card to start.
          </p>
          <div className="mt-7 flex flex-col gap-3 text-left">
            {PLAN_INCLUDES.map((line) => (
              <p key={line} className="text-[15px] text-[var(--cat-on-ink)]">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href="/auth/sign-up"
              className="block rounded-full bg-[var(--cat-surface)] py-3.5 text-[15px] font-medium text-[var(--cat-ink)]"
            >
              Do it yourself
            </Link>
            <Link
              href="/setup"
              className="block rounded-full border border-[var(--cat-on-ink)]/25 py-3.5 text-[15px] font-medium text-[var(--cat-on-ink)]"
            >
              We’ll set it up
            </Link>
          </div>
          <p className="mt-3.5 text-xs text-[var(--cat-on-ink-faint)]">
            Same plan either way. Cancel in one click.
          </p>
        </div>
        <p className="mx-auto mt-5 max-w-[460px] text-center text-[13px] text-[var(--cat-muted)]">
          Need a second shop? Add it when you’re ready.
        </p>
      </section>

      <section id="faq" className="mx-auto max-w-[720px] px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="font-catalog-display text-center text-[clamp(28px,4vw,44px)] font-semibold tracking-tight">
          Questions
        </h2>
        <dl className="mt-10 flex flex-col gap-6">
          {MARKETING_FAQS.map((item) => (
            <div key={item.q}>
              <dt className="text-[17px] font-semibold tracking-tight">{item.q}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-[var(--cat-muted)]">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mx-auto mt-10 max-w-[1120px] px-5 text-center text-[13px] text-[var(--cat-muted)] sm:px-6">
        Every catalog also gets a free subdomain on {PRODUCT_DOMAIN}. Point your own domain when you are ready.
      </p>
      <CompanyContact className="mx-auto mt-4 max-w-[1120px] px-5 text-center text-[13px] text-[var(--cat-muted)] sm:px-6" />

      <div className="mt-20">
        <MarketingFooter variant="home" />
      </div>
    </div>
  );
}

function DoorCard({
  kicker,
  title,
  body,
  href,
  cta,
  primary,
}: {
  kicker: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[22px] border p-6 text-left sm:p-8 ${
        primary
          ? "border-[var(--cat-accent)] bg-[var(--cat-accent)] text-[var(--cat-surface)]"
          : "border-[var(--cat-border)] bg-[var(--cat-bg)]"
      }`}
    >
      <p className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${primary ? "text-white/80" : "text-[var(--cat-accent)]"}`}>
        {kicker}
      </p>
      <h2 className="font-catalog-display mt-2 text-[26px] font-semibold tracking-tight">{title}</h2>
      <p className={`mt-3 text-[15px] leading-relaxed ${primary ? "text-white/90" : "text-[var(--cat-muted)]"}`}>
        {body}
      </p>
      <span
        className={`mt-6 inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-medium ${
          primary ? "bg-[var(--cat-surface)] text-[var(--cat-accent)]" : "bg-[var(--cat-ink)] text-[var(--cat-surface)]"
        }`}
      >
        {cta}
      </span>
    </Link>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[20px] bg-[var(--cat-bg)] p-6 sm:p-7">
      <h3 className="font-catalog-display text-[20px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--cat-muted)]">{body}</p>
    </div>
  );
}

const PREVIEW_SHAPES: Record<string, { cols: string; count: number }> = {
  grid: { cols: "grid-cols-3", count: 9 },
  lookbook: { cols: "grid-cols-2", count: 4 },
  menu: { cols: "grid-cols-1", count: 5 },
  pricelist: { cols: "grid-cols-1", count: 7 },
  cards: { cols: "grid-cols-2", count: 4 },
  compact: { cols: "grid-cols-1", count: 7 },
  spotlight: { cols: "grid-cols-2", count: 5 },
};

function TemplatePreviewBlocks({ templateKey }: { templateKey: string }) {
  const shape = PREVIEW_SHAPES[templateKey] ?? PREVIEW_SHAPES.grid;
  return (
    <div className={`grid flex-1 gap-1.5 ${shape.cols}`}>
      {Array.from({ length: shape.count }).map((_, i) => (
        <div key={i} className="min-h-[14px] rounded-md bg-[var(--cat-photo-bg)]" />
      ))}
    </div>
  );
}
