"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { TEMPLATES } from "@/lib/catalog/templates";
import type { CatalogTemplateKey } from "@/lib/catalog/types";

const SAMPLE_ITEMS = [
  { code: "GSA011", name: "Professional Cotton Mop", price: 28.25, pack: "1 pc", image: "/catalog/images/GSA011.jpg", description: "60cm flat mop with mixed cotton refill and a 135cm metal handle." },
  { code: "KT2412", name: "Bucket with Wringer", price: 22, pack: "1 pc", image: "/catalog/images/KT2412.jpg", description: "15 litre bucket with side wringer and metal grip." },
  { code: "K19008", name: "Microfiber Flat Mop", price: 21.75, pack: "1 set", image: "/catalog/images/K19008.jpg", description: "41 x 10.5cm flat mop set with a telescopic 75–130cm handle." },
  { code: "KB2202", name: 'Window Cleaner 10"', price: 20.75, pack: "1 pc", image: "/catalog/images/KB2202.jpg", description: "10 inch head that rotates a full 360 degrees." },
  { code: "GSE002", name: "Microfiber Duster", price: 15, pack: "1 pc", image: "/catalog/images/GSE002.jpg", description: "35cm bendable microfiber head on a telescopic handle." },
  { code: "K19002", name: "Floor Squeegee", price: 13, pack: "1 pc", image: "/catalog/images/K19002.jpg", description: "42cm head on a 130cm metal handle." },
  { code: "GSC001", name: "Dustpan & Broom", price: 11.25, pack: "1 set", image: "/catalog/images/GSC001.jpg", description: "25.5cm dustpan with an 80mm bristle broom." },
  { code: "GSH001", name: "Sponge Scourer 6pcs", price: 4, pack: "6 pcs", image: "/catalog/images/GSH001.jpg", description: "13 x 9cm scouring pads, six to a pack." },
];

export default function TemplatesGalleryPage() {
  const [active, setActive] = useState<CatalogTemplateKey>("grid");
  const meta = TEMPLATES.find((t) => t.key === active)!;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketingHeader />
      <div className="px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-[1080px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-semibold tracking-tight">Catalog templates</h1>
            <p className="mt-2 text-[15px] text-[#6e6e73]">
              The same items, several layouts. Pick one while creating and switch any time.
            </p>
          </div>
          <Link href="/new" className="rounded-full bg-[var(--cat-accent)] px-5 py-2.5 text-sm font-medium text-white">
            Use a template
          </Link>
        </div>

        <div className="mb-5 mt-7 flex flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setActive(tpl.key)}
              className={`rounded-full border px-4.5 py-2 text-[13px] font-semibold ${
                active === tpl.key
                  ? "border-[#1d1d1f] bg-[#1d1d1f] text-white"
                  : "border-[#d2d2d7] bg-white text-[#1d1d1f]"
              }`}
            >
              {tpl.name}
            </button>
          ))}
        </div>
        <p className="mb-5 max-w-[620px] text-sm leading-relaxed text-[#6e6e73]">{meta.longBlurb}</p>

        <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_30px_60px_-34px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2.5 border-b border-[#e8e8ed] bg-[#fbfbfd] px-3.5 py-2.5">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="flex-1 rounded-md bg-[#f0f0f4] px-2.5 py-1 text-center text-xs text-[#6e6e73]">
              yourcatalog.catalog.hevyf.com
            </span>
          </div>

          {active === "grid" && <GridPreview />}
          {active === "lookbook" && <LookbookPreview />}
          {active === "menu" && <MenuPreview />}
          {active === "pricelist" && <PriceListPreview />}
          {active === "cards" && <CardsPreview />}
          {active === "compact" && <CompactPreview />}
          {active === "spotlight" && <SpotlightPreview />}
        </div>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

function GridPreview() {
  return (
    <div style={{ background: "#f1f4f8" }}>
      <div className="flex items-center justify-between border-b border-[#dce2ea] bg-white px-5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-[var(--cat-accent)]">EXAMPLE CO</span>
          <span className="text-xs font-medium uppercase tracking-wide text-[#46505e]">Trade Catalogue</span>
        </div>
        <span className="rounded-lg bg-[var(--cat-accent)] px-4 py-2 text-sm font-semibold text-white">Cart 0</span>
      </div>
      <div className="p-5">
        <div className="mb-3.5 flex items-baseline gap-2 border-b border-[#dce2ea] pb-2">
          <h2 className="text-lg font-bold">All items</h2>
          <span className="text-sm text-[#46505e]">{SAMPLE_ITEMS.length} items</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SAMPLE_ITEMS.map((p) => (
            <div key={p.code} className="overflow-hidden rounded-[14px] border border-[#dce2ea] bg-white shadow-sm">
              <div className="relative aspect-[584/480] bg-[#eef1f5]">
                <Image src={p.image} alt={p.name} fill sizes="200px" className="object-contain" />
              </div>
              <div className="p-3">
                <p className="text-[15px] font-semibold leading-tight">{p.name}</p>
                <p className="text-xs text-[#46505e]">{p.code}</p>
                <p className="mt-2 text-[10px] font-medium uppercase text-[#46505e]">QAR</p>
                <p className="mb-2.5 text-lg font-bold">{p.price.toFixed(2)}</p>
                <div className="rounded-lg border border-[var(--cat-accent)] py-2 text-center text-sm font-semibold text-[var(--cat-accent)]">
                  Add to order
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LookbookPreview() {
  return (
    <div className="bg-white px-9 py-12 sm:px-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">Example Co · Season list</p>
      <h2 className="mt-3.5 max-w-lg text-[clamp(28px,4vw,44px)] font-semibold leading-[1.06] tracking-tight">
        A short list, presented properly.
      </h2>
      <div className="mt-11 grid grid-cols-1 gap-10 sm:grid-cols-2">
        {SAMPLE_ITEMS.slice(0, 4).map((p) => (
          <div key={p.code}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[#f5f5f7]">
              <Image src={p.image} alt={p.name} fill sizes="400px" className="object-contain" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">{p.name}</h3>
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-[#6e6e73]">{p.description}</p>
            <div className="mt-4 flex items-center gap-4">
              <span className="text-[17px] font-semibold">QAR {p.price.toFixed(2)}</span>
              <span className="rounded-full border border-[#1d1d1f] px-4.5 py-2 text-[13px] font-medium">
                Add to order
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuPreview() {
  const sections = [
    { title: "Mops & Buckets", rows: SAMPLE_ITEMS.slice(0, 3) },
    { title: "Cleaning tools", rows: SAMPLE_ITEMS.slice(3, 6) },
    { title: "Scourers & cloths", rows: SAMPLE_ITEMS.slice(6, 8) },
  ];
  return (
    <div style={{ background: "#fffdf8" }} className="px-9 py-11 sm:px-11">
      <div className="border-b border-[#e6e0d3] pb-5.5 text-center">
        <h2 className="text-[28px] font-semibold uppercase tracking-[0.02em]">Example Co Supply List</h2>
        <p className="mt-2 text-[13px] text-[#8a8171]">Prices in QAR · Delivery within 48 hours</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2">
        {sections.map((sec) => (
          <div key={sec.title}>
            <p className="mb-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8171]">{sec.title}</p>
            {sec.rows.map((row) => (
              <div key={row.code} className="flex items-baseline gap-2.5 border-b border-dotted border-[#ddd5c5] py-2.5">
                <span className="text-[15px] font-medium">{row.name}</span>
                <span className="flex-1" />
                <span className="text-[15px] font-semibold">{row.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-9 text-center text-[13px] text-[#8a8171]">Tap any line to add it to your order</p>
    </div>
  );
}

function CardsPreview() {
  return (
    <div className="bg-white px-5 py-8 sm:px-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SAMPLE_ITEMS.slice(0, 4).map((p) => (
          <div key={p.code} className="overflow-hidden rounded-[18px] border border-[#e8e8ed]">
            <div className="relative aspect-[16/10] bg-[#f5f5f7]">
              <Image src={p.image} alt={p.name} fill sizes="360px" className="object-contain" />
            </div>
            <div className="px-4 pb-4 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">{p.code}</p>
              <h3 className="mt-1 text-[18px] font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6e6e73]">{p.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[15px] font-semibold">QAR {p.price.toFixed(2)}</span>
                <span className="rounded-full bg-[var(--cat-accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white">
                  Add to order
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactPreview() {
  return (
    <div className="bg-white px-5 py-6 sm:px-8">
      <div className="overflow-hidden rounded-[12px] border border-[#e8e8ed]">
        {SAMPLE_ITEMS.map((p) => (
          <div key={p.code} className="flex items-center gap-2.5 border-b border-[#f0f0f4] px-2.5 py-2 last:border-b-0">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-[#eef1f5]">
              <Image src={p.image} alt="" fill sizes="44px" className="object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{p.name}</p>
              <p className="text-[11px] text-[#86868b]">{p.code} · {p.pack}</p>
            </div>
            <span className="shrink-0 text-sm font-bold">{p.price.toFixed(2)}</span>
            <span className="shrink-0 rounded-[8px] border border-[var(--cat-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--cat-accent)]">
              Add
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpotlightPreview() {
  const [hero, ...rest] = SAMPLE_ITEMS;
  return (
    <div className="bg-white px-5 py-6 sm:px-8">
      <div className="overflow-hidden rounded-[18px] border border-[#e8e8ed] sm:grid sm:grid-cols-2">
        <div className="relative aspect-[4/3] bg-[#f5f5f7] sm:aspect-auto sm:min-h-[220px]">
          <Image src={hero.image} alt={hero.name} fill sizes="400px" className="object-contain" />
        </div>
        <div className="px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">Featured</p>
          <h3 className="mt-2 text-[24px] font-semibold tracking-tight">{hero.name}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6e6e73]">{hero.description}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[17px] font-semibold">QAR {hero.price.toFixed(2)}</span>
            <span className="rounded-full bg-[var(--cat-accent)] px-4 py-2 text-[12px] font-semibold text-white">
              Add to order
            </span>
          </div>
        </div>
      </div>
      <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">More items</p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {rest.slice(0, 4).map((p) => (
          <div key={p.code} className="overflow-hidden rounded-[12px] border border-[#e8e8ed]">
            <div className="relative aspect-[584/480] bg-[#eef1f5]">
              <Image src={p.image} alt={p.name} fill sizes="140px" className="object-contain" />
            </div>
            <div className="p-2">
              <p className="truncate text-[12px] font-semibold">{p.name}</p>
              <p className="mt-1 text-[12px] font-bold">{p.price.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceListPreview() {
  return (
    <div className="bg-white px-9 py-10 sm:px-11">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#1d1d1f] pb-3.5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Example Co trade price list</h2>
          <p className="mt-1.5 text-[13px] text-[#6e6e73]">All prices QAR, excluding delivery</p>
        </div>
      </div>
      <div className="grid grid-cols-[110px_minmax(0,2fr)_1fr_90px] gap-3 border-b border-[#d2d2d7] py-3 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
        <span>Code</span>
        <span>Item</span>
        <span>Pack</span>
        <span className="text-right">Price</span>
      </div>
      {SAMPLE_ITEMS.map((p) => (
        <div
          key={p.code}
          className="grid grid-cols-[110px_minmax(0,2fr)_1fr_90px] items-baseline gap-3 border-b border-[#f0f0f4] py-2.5 text-[13px]"
        >
          <span className="text-[#6e6e73]">{p.code}</span>
          <span className="font-medium">{p.name}</span>
          <span className="text-[#6e6e73]">{p.pack}</span>
          <span className="text-right font-semibold">{p.price.toFixed(2)}</span>
        </div>
      ))}
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs text-[#6e6e73]">
        <span>Order by phone or tap any row</span>
        <span>Download PDF</span>
      </div>
    </div>
  );
}
