import Image from "next/image";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MONTHLY_PRICE_USD } from "@/lib/billing/plan";
import { PRODUCT_DOMAIN, PRODUCT_NAME_LONG } from "@/lib/brand";
import { TEMPLATES } from "@/lib/catalog/templates";

// Display-only — the product's intended home once its domain is pointed at
// this app (see PLAN.md / CLOUDFLARE.md). Routing itself follows
// NEXT_PUBLIC_ROOT_DOMAIN, which defaults to localhost in dev.
const MONTHLY_PRICE = MONTHLY_PRICE_USD;
const TRIAL_DAYS = 14;

const HERO_ITEMS = [
  { name: "Professional Cotton Mop", code: "GSA011", price: "QAR 28.25", image: "/catalog/images/GSA011.jpg" },
  { name: "Bucket with Wringer", code: "KT2412", price: "QAR 22.00", image: "/catalog/images/KT2412.jpg" },
  { name: "Microfiber Duster", code: "GSE002", price: "QAR 15.00", image: "/catalog/images/GSE002.jpg" },
  { name: 'Window Cleaner 10"', code: "KB2202", price: "QAR 20.75", image: "/catalog/images/KB2202.jpg" },
];

const PLAN_INCLUDES = [
  "Unlimited catalogs and items",
  "All catalog templates",
  "Free subdomain, custom domain included",
  "Orders by email, inbox and CSV",
  "Views and order analytics per catalog",
];

export default function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden bg-white text-[#1d1d1f]">
      <MarketingHeader variant="home" />

      <section className="mx-auto max-w-[1120px] px-6 pt-24 text-center">
        <p className="mb-4 text-[15px] text-[#6e6e73]">
          <span className="font-medium text-[#1d1d1f]">{PRODUCT_NAME_LONG}</span>
          {" · For suppliers, shops, kitchens and distributors"}
        </p>
        <h1 className="mx-auto text-balance text-[clamp(40px,6.4vw,76px)] font-semibold leading-[1.04] tracking-[-0.035em]">
          Your catalog, live in
          <br />
          five minutes.
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-pretty text-[clamp(17px,2vw,21px)] leading-[1.45] text-[#6e6e73]">
          Add your items, pick a template, share the link. Customers browse, add quantities and
          send an order — straight to your inbox and dashboard. No storefront to build, no
          payment setup, no developer.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/new" className="rounded-full bg-[var(--cat-accent)] px-6 py-3 text-[15px] font-medium text-white">
            Create your catalog
          </Link>
          <a href="#templates" className="rounded-full border border-black/[0.14] px-6 py-3 text-[15px] font-medium">
            See templates
          </a>
        </div>
        <p className="mt-4 text-[13px] text-[#86868b]">
          {TRIAL_DAYS} days free, then ${MONTHLY_PRICE} a month. Unlimited catalogs.
        </p>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pt-14">
        <div className="rounded-[24px] bg-[#f5f5f7] p-4 sm:p-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-2.5 border-b border-[#e8e8ed] bg-[#fbfbfd] px-3.5 py-2.5">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="flex-1 rounded-md bg-[#f0f0f4] px-2.5 py-1 text-center text-xs text-[#6e6e73]">
                kleaner.{PRODUCT_DOMAIN}
              </span>
            </div>
            <div className="px-5 pb-6 pt-4.5">
              <div className="flex items-baseline justify-between gap-3 border-b border-[#e8e8ed] pb-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[17px] font-bold tracking-tight text-[var(--cat-accent)]">KLEANER</span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#6e6e73]">
                    Trade Catalogue
                  </span>
                </div>
                <span className="rounded-lg bg-[var(--cat-accent)] px-3.5 py-1.5 text-xs font-semibold text-white">
                  Cart 12
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
                {HERO_ITEMS.map((item) => (
                  <div key={item.code} className="overflow-hidden rounded-xl border border-[#e8e8ed] bg-white">
                    <div className="relative aspect-[584/480] bg-[#eef1f5]">
                      <Image src={item.image} alt={item.name} fill sizes="200px" className="object-contain" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-[13px] font-semibold tracking-tight">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#86868b]">{item.code}</p>
                      <p className="mt-2 text-sm font-semibold">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1120px] px-6 pt-28">
        <h2 className="text-center text-[clamp(30px,3.6vw,44px)] font-semibold tracking-tight">
          Three steps. That is the whole product.
        </h2>
        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StepCard step="Step one" title="Add your items">
            Type a name and a price, attach a photo from your camera or your files. Or paste a
            list and every row becomes an item. Item codes and barcodes are optional.
          </StepCard>
          <StepCard step="Step two" title="Pick a template">
            A few layouts, each built for a different kind of selling. Choose one, set your
            colour, and the catalog is designed.
          </StepCard>
          <StepCard step="Step three" title="Share the link">
            You get a link on your own subdomain the moment you publish. Send it on WhatsApp,
            email or print it as a QR code.
          </StepCard>
        </div>
      </section>

      <section id="templates" className="mx-auto max-w-[1120px] px-6 pt-28">
        <h2 className="text-center text-[clamp(30px,3.6vw,44px)] font-semibold tracking-tight">
          Templates.
        </h2>
        <p className="mx-auto mt-3.5 max-w-[560px] text-center text-[17px] leading-relaxed text-[#6e6e73]">
          Pick one while you create. Switch any time without touching your items.
        </p>
        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((tpl) => (
            <div key={tpl.key} className="overflow-hidden rounded-[20px] border border-[#e8e8ed] bg-white">
              <div className="flex aspect-[4/3] items-stretch bg-[#f5f5f7] p-4.5">
                <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-[10px] bg-white p-3 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.3)]">
                  <div className="h-1.5 w-2/5 rounded-full bg-[#1d1d1f]" />
                  <TemplatePreviewBlocks templateKey={tpl.key} />
                </div>
              </div>
              <div className="px-5 pb-5.5 pt-4.5">
                <h3 className="text-[17px] font-semibold tracking-tight">{tpl.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#6e6e73]">{tpl.blurb}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-sm">
          <Link href="/templates" className="text-[var(--cat-accent)]">
            Open the full template previews
          </Link>
        </p>
      </section>

      <section className="mt-28 bg-[#f5f5f7] py-24">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-[clamp(28px,3.4vw,42px)] font-semibold tracking-tight">
              Orders arrive three ways.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
              Every order lands in your email with the full line list, sits in the dashboard
              inbox for the team, and exports to CSV for your accounts. Prices are recalculated
              on the server, so a customer can never send you a discounted total.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Email", "Dashboard inbox", "CSV export"].map((t) => (
                <span key={t} className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[18px] bg-white p-6 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)]">
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-semibold tracking-tight">New order KL-4821</p>
              <span className="text-xs text-[#86868b]">2 minutes ago</span>
            </div>
            <p className="mb-4.5 mt-1 text-[13px] text-[#6e6e73]">
              Al Nasr Trading · +974 3300 0000 · Zone 55, Doha
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                ["GSA011 · Professional Cotton Mop × 12", "339.00"],
                ["GSH001 · Sponge Scourer 6pcs × 24", "96.00"],
                ["KT2412 · Bucket with Wringer × 6", "132.00"],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex justify-between text-[13px] ${i < 2 ? "border-b border-[#e8e8ed] pb-2.5" : ""}`}
                >
                  <span className="text-[#6e6e73]">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4.5 flex justify-between border-t border-[#1d1d1f] pt-3.5 text-[15px] font-semibold">
              <span>Total</span>
              <span>QAR 567.00</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pt-28 text-center">
        <h2 className="text-[clamp(30px,3.6vw,44px)] font-semibold tracking-tight">
          On your own domain.
        </h2>
        <p className="mx-auto mt-4 max-w-[600px] text-[17px] leading-relaxed text-[#6e6e73]">
          Every catalog gets a free subdomain the second it publishes. Point your own domain at
          it whenever you are ready — two records, verified automatically, certificate included.
        </p>
        <div className="mt-9 grid grid-cols-1 gap-5 text-left sm:grid-cols-2">
          <div className="rounded-[20px] border border-[#e8e8ed] p-6.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#86868b]">Included</p>
            <p className="mt-3 text-xl font-semibold tracking-tight">kleaner.{PRODUCT_DOMAIN}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
              Live instantly, HTTPS by default, nothing to configure.
            </p>
          </div>
          <div className="rounded-[20px] border border-[#e8e8ed] p-6.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#86868b]">Optional</p>
            <p className="mt-3 text-xl font-semibold tracking-tight">catalog.yourcompany.com</p>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
              Add a CNAME, we verify and issue the certificate for you.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1120px] px-6 pt-28">
        <h2 className="text-center text-[clamp(30px,3.6vw,44px)] font-semibold tracking-tight">
          One price.
        </h2>
        <div className="mx-auto mt-11 max-w-[460px] rounded-[24px] bg-[#1d1d1f] p-10 text-center text-white">
          <p className="text-sm text-[#a1a1a6]">{TRIAL_DAYS} days free</p>
          <p className="mt-3 text-[64px] font-semibold leading-none tracking-tighter">${MONTHLY_PRICE}</p>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">per month, per company</p>
          <div className="mt-7 flex flex-col gap-3 text-left">
            {PLAN_INCLUDES.map((line) => (
              <p key={line} className="text-[15px] text-[#f5f5f7]">
                {line}
              </p>
            ))}
          </div>
          <Link
            href="/auth/sign-up"
            className="mt-7 block rounded-full bg-white py-3.5 text-[15px] font-medium text-[#1d1d1f]"
          >
            Start your free trial
          </Link>
          <p className="mt-3.5 text-xs text-[#86868b]">No card to start. Cancel in one click.</p>
        </div>
      </section>

      <div className="mt-28">
        <MarketingFooter variant="home" />
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-[#f5f5f7] p-7">
      <p className="text-[13px] font-semibold text-[var(--cat-accent)]">{step}</p>
      <h3 className="mb-2 mt-2.5 text-[21px] font-semibold tracking-tight">{title}</h3>
      <p className="text-[15px] leading-relaxed text-[#6e6e73]">{children}</p>
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
        <div key={i} className="min-h-[14px] rounded-md bg-[#e3e8ef]" />
      ))}
    </div>
  );
}
