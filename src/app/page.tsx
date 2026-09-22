import Link from "next/link";
import { FloorMapSample } from "@/components/marketing/FloorMapSample";
import { HarborPreview } from "@/components/marketing/HarborPreview";
import { JsonLd } from "@/components/marketing/JsonLd";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { OpsAlarmPhone, OpsMenu86Phone, OpsNowPhone, OpsOrdersPhone } from "@/components/marketing/OpsPhoneScreens";
import { OpsTabletBoard } from "@/components/marketing/OpsTabletBoard";
import { WebDashPreview } from "@/components/marketing/WebDashPreview";
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_USD, TRIAL_DAYS_LABEL } from "@/lib/billing/plan";
import { CompanyContact } from "@/components/brand/CompanyContact";
import { PRODUCT_DOMAIN, PRODUCT_NAME_LONG } from "@/lib/brand";
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
  "Reservations and floor map",
  "Orders on dashboard, phone, and tablet",
  "86 items and pause store",
];

export default function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden bg-[var(--cat-surface)] text-[var(--cat-ink)]">
      <JsonLd data={marketingJsonLd()} />
      <MarketingHeader variant="home" />

      <section className="mx-auto max-w-[70rem] px-5 pt-12 sm:px-6 sm:pt-16">
        <p className="mb-4 text-center text-[0.875rem] text-[var(--cat-muted)] sm:text-[0.9375rem]">
          <span className="font-medium text-[var(--cat-ink)]">{PRODUCT_NAME_LONG}</span>
          {" · QR catalog + kitchen ops"}
        </p>
        <h1 className="mkt-display font-catalog-display mx-auto max-w-[57.5rem] text-balance text-center text-[clamp(2.125rem,7.2vw,4.25rem)] font-semibold">
          Guests order from the menu.
          <br />
          The kitchen hears it.
        </h1>
        <p className="mx-auto mt-5 max-w-[40rem] text-pretty text-center text-[clamp(1rem,2.4vw,1.25rem)] leading-[1.5] text-[var(--cat-muted)]">
          A live catalog on the guest&apos;s phone — QR dine-in, reserve, pickup, delivery — and an
          ops companion on a kitchen phone or iPad. Edit your menu in the web dashboard.
        </p>
        <p className="mt-4 text-center text-[0.8125rem] leading-relaxed text-[var(--cat-muted)]">
          {TRIAL_DAYS_LABEL} · no card · then {MONTHLY_PRICE_LABEL} · cancel anytime
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/sign-up" className="mkt-btn-primary">
            Start free
          </Link>
          <Link href="/setup" className="mkt-btn-secondary">
            We&apos;ll set it up
          </Link>
        </div>
        <p className="mt-3 text-center text-[0.75rem] text-[var(--cat-muted)]">
          No App Store link yet — ops is on the roadmap for phone and tablet.
        </p>
      </section>

      <section className="mx-auto max-w-[73.75rem] px-5 pt-12 sm:px-6">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <OpsAlarmPhone />
          <div className="min-w-0">
            <OpsTabletBoard />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[70rem] px-5 pt-16 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <DoorCard
            kicker="Start today"
            title="Put the menu up yourself"
            body="Upload dishes and go live. Guests can order the same day."
            href="/auth/sign-up"
            cta="Start free"
          />
          <DoorCard
            kicker="We'll do it"
            title="Send the menu. We open the place."
            body={`Menu, logo, and how to reach you. Same ${TRIAL_DAYS_LABEL} — not a second price.`}
            href="/setup"
            cta="Tell us about the place"
          />
        </div>
        <p className="mt-4 text-center text-[0.75rem] text-[var(--cat-muted)]">
          Same plan either way.
        </p>
      </section>

      <section id="how" className="mx-auto max-w-[70rem] scroll-mt-20 px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="mkt-display font-catalog-display text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          Guest orders. Kitchen bumps.
        </h2>
        <p className="mx-auto mt-3 max-w-[35rem] text-center text-[1rem] leading-relaxed text-[var(--cat-muted)]">
          Same ticket on the web inbox, a phone list, or a four-lane tablet board.
        </p>
        <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
          <Step
            n="1"
            title="Guest sends it"
            body="QR on the table, or the live link. Dine-in, pickup, or delivery. Reserve picks a table on the floor map."
          />
          <Step
            n="2"
            title="Kitchen hears it"
            body="A loud full-screen alarm on the ops phone. Table number big. Accept & start in one tap."
          />
          <Step
            n="3"
            title="Bump the ticket"
            body="New → Preparing → Ready → Done. Waiter and bill alerts land on the same device."
          />
        </ol>
      </section>

      <section id="ops" className="mx-auto max-w-[70rem] scroll-mt-20 px-5 pt-24 sm:px-6 sm:pt-28">
        <p className="text-center text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--cat-accent)]">
          Ops · iOS and Android
        </p>
        <h2 className="mkt-display font-catalog-display mt-2 text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          Phone in the pocket. iPad on the pass.
        </h2>
        <p className="mx-auto mt-3 max-w-[37.5rem] text-center text-[1rem] leading-relaxed text-[var(--cat-muted)]">
          Companion for the floor — hear new orders, 86 a dish, pause the store.
          Coming to iPhone, Android, and iPad. Edit your menu, floor, QR, and billing on the web dashboard.
        </p>
        <div className="mt-12 grid items-start justify-center gap-10 sm:grid-cols-2">
          <OpsNowPhone />
          <OpsOrdersPhone />
        </div>
      </section>

      <section id="floor" className="mx-auto max-w-[70rem] scroll-mt-20 px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="mkt-display font-catalog-display text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          Floor map, not a stock photo.
        </h2>
        <p className="mx-auto mt-3 max-w-[35rem] text-center text-[1rem] leading-relaxed text-[var(--cat-muted)]">
          Draw tables in the web studio. Guests pick a table to reserve. Staff see seated, booked,
          waiter, and bill on the same plan.
        </p>
        <div className="mt-10">
          <FloorMapSample />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Feature title="Reserve" body="Day, time, and a table. It lands in the same inbox as orders." />
          <Feature title="Waiter / bill" body="A diner taps Call waiter or Request bill. Ops interrupts." />
          <Feature title="Closed tables" body="Mark a two-top out of service. Guests cannot book it." />
        </div>
      </section>

      <section id="day-of" className="mx-auto max-w-[70rem] scroll-mt-20 px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="mkt-display font-catalog-display text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          86 a dish. Pause the store.
        </h2>
        <p className="mx-auto mt-3 max-w-[35rem] text-center text-[1rem] leading-relaxed text-[var(--cat-muted)]">
          Day-of control on the phone. Available or Sold out is the same list guests see. Pause
          checkout without killing tickets already in the kitchen.
        </p>
        <div className="mt-12 grid items-center gap-10 md:grid-cols-[minmax(0,17rem)_1fr]">
          <OpsMenu86Phone />
          <div className="grid gap-8">
            <Feature
              title="Pause new orders"
              body="Guests can still read the menu. They cannot check out. Tickets already accepted still finish."
            />
            <Feature
              title="Close kitchen"
              body="Storefront shows closed. New orders and table requests stay off until you reopen."
            />
            <Feature
              title="Sold out"
              body="Harbor chowder and olive focaccia off the list. Flip them back when the pot is ready."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[70rem] px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="mkt-display font-catalog-display text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          What guests open
        </h2>
        <p className="mx-auto mt-3 max-w-[35rem] text-center text-[1rem] leading-relaxed text-[var(--cat-muted)]">
          Harbor Kitchen is a demo — a sample restaurant, not a real venue. Open it for dine-in,
          pickup, delivery, and reserve.
        </p>
        <div className="mt-12">
          <HarborPreview />
        </div>
      </section>

      <section id="dashboard" className="mx-auto max-w-[70rem] scroll-mt-20 px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="mkt-display font-catalog-display text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          Web dashboard for the deep work
        </h2>
        <p className="mx-auto mt-3 max-w-[35rem] text-center text-[1rem] leading-relaxed text-[var(--cat-muted)]">
          Ops does not replace the web dashboard. Items, floor, QR, look, domains, and
          billing stay on the web.
        </p>
        <div className="mt-10">
          <WebDashPreview />
        </div>
        <p className="mx-auto mt-6 max-w-[35rem] text-center text-[0.875rem] leading-relaxed text-[var(--cat-muted)]">
          Restaurant menu is the default for kitchens.{" "}
          <Link href="/templates" className="mkt-press font-medium text-[var(--cat-ink)] underline-offset-2 hover:underline">
            Trade catalogs
          </Link>{" "}
          still get Grid and Price List.
        </p>
      </section>

      <section id="pricing" className="mx-auto max-w-[70rem] scroll-mt-20 px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="mkt-display font-catalog-display text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          One plan
        </h2>
        <p className="mx-auto mt-3 max-w-[26rem] text-center text-[1rem] leading-relaxed text-[var(--cat-muted)]">
          One live shop. {TRIAL_DAYS_LABEL}, then {MONTHLY_PRICE_LABEL}.
        </p>
        <div className="mx-auto mt-8 max-w-[28.75rem] rounded-[1.5rem] bg-[var(--cat-ink)] px-8 py-10 text-center text-[var(--cat-on-ink)] shadow-[0_40px_80px_-36px_rgba(16,23,32,0.55)] sm:px-10">
          <p className="text-[0.875rem] text-[var(--cat-on-ink-muted)]">{TRIAL_DAYS_LABEL}</p>
          <p className="mkt-display mt-3 text-[3.5rem] font-semibold sm:text-[4rem]">
            ${MONTHLY_PRICE_USD}
          </p>
          <p className="mt-2 text-[0.9375rem] text-[var(--cat-on-ink-muted)]">per month</p>
          <p className="mx-auto mt-5 max-w-[17.5rem] text-[0.75rem] leading-[1.35] tracking-[-0.011em] text-[var(--cat-on-ink-faint)]">
            One wrong WhatsApp order costs more than a month. Guests scan, kitchen hears it.
          </p>
          <div className="mt-7 flex flex-col gap-3 text-left">
            {PLAN_INCLUDES.map((line) => (
              <p key={line} className="text-[0.9375rem] text-[var(--cat-on-ink)]">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href="/auth/sign-up"
              className="mkt-press block rounded-full bg-[var(--cat-surface)] py-3.5 text-[0.9375rem] font-medium text-[var(--cat-ink)]"
            >
              Do it yourself
            </Link>
            <Link
              href="/setup"
              className="mkt-press block rounded-full bg-white/10 py-3.5 text-[0.9375rem] font-medium text-[var(--cat-on-ink)]"
            >
              We&apos;ll set it up
            </Link>
          </div>
          <p className="mt-3.5 text-[0.75rem] text-[var(--cat-on-ink-faint)]">
            Same plan either way. Cancel in one click.
          </p>
        </div>
        <p className="mx-auto mt-5 max-w-[28.75rem] text-center text-[0.8125rem] text-[var(--cat-muted)]">
          Need a second shop? Add it when you&apos;re ready.
        </p>
      </section>

      <section id="faq" className="mx-auto max-w-[45rem] scroll-mt-20 px-5 pt-24 sm:px-6 sm:pt-28">
        <h2 className="mkt-display font-catalog-display text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold">
          Questions
        </h2>
        <dl className="mt-12 flex flex-col gap-8">
          {MARKETING_FAQS.map((item) => (
            <div key={item.q}>
              <dt className="text-[1.0625rem] font-semibold tracking-tight">{item.q}</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--cat-muted)]">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-[45rem] px-5 pt-20 text-center sm:px-6">
        <h2 className="mkt-display font-catalog-display text-[clamp(1.625rem,4vw,2.5rem)] font-semibold">
          Open the catalog. Run the floor.
        </h2>
        <p className="mx-auto mt-3 max-w-[30rem] text-[0.9375rem] leading-relaxed text-[var(--cat-muted)]">
          Start on the web today. Ops on phone and iPad is next.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/sign-up" className="mkt-btn-primary">
            Start free
          </Link>
          <Link href="/live" className="mkt-btn-secondary">
            See the Harbor demo
          </Link>
        </div>
      </section>

      <p className="mx-auto mt-10 max-w-[70rem] px-5 text-center text-[0.8125rem] text-[var(--cat-muted)] sm:px-6">
        Every catalog also gets a free subdomain on {PRODUCT_DOMAIN}. Point your own domain when you are ready.
      </p>
      <CompanyContact className="mx-auto mt-4 max-w-[70rem] px-5 text-center text-[0.8125rem] text-[var(--cat-muted)] sm:px-6" />

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
}: {
  kicker: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="mkt-press rounded-[1.375rem] bg-[var(--cat-bg)] p-6 text-left sm:p-8"
    >
      <p className="text-[0.8125rem] text-[var(--cat-muted)]">{kicker}</p>
      <h2 className="mkt-display font-catalog-display mt-2 text-[1.5rem] font-semibold tracking-tight sm:text-[1.625rem]">
        {title}
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--cat-muted)]">{body}</p>
      <span className="mt-6 inline-flex min-h-11 items-center text-[0.9375rem] font-medium text-[var(--cat-accent)]">
        {cta}
      </span>
    </Link>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mkt-display font-catalog-display text-[1.25rem] font-semibold">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--cat-muted)]">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li>
      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--cat-accent)]">
        {n}
      </p>
      <h3 className="mkt-display font-catalog-display mt-2 text-[1.25rem] font-semibold">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--cat-muted)]">{body}</p>
    </li>
  );
}
