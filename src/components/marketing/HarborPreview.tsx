import Link from "next/link";
import { PhoneFrame } from "@/components/marketing/DeviceFrame";
import { buildHarborKitchenCatalog, HARBOR_LIVE_PATH } from "@/lib/catalog/demo-harbor";
import { formatMoney } from "@/lib/catalog/currency";

export function HarborPreview() {
  const catalog = buildHarborKitchenCatalog();
  const featured = catalog.items.filter((item) => item.featured).slice(0, 2);
  const rest = catalog.items.filter((item) => !item.featured).slice(0, 3);
  const featuredTitle = catalog.settings.menu.featuredTitle;

  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-center text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--cat-accent)]">
        Demo · sample restaurant
      </p>
      <PhoneFrame label="Demo · Harbor Kitchen, table 5. Sample menu guests open from the QR.">
        <div className="flex h-[26.25rem] flex-col bg-[var(--cat-bg)] text-left" aria-hidden>
          <div className="border-b border-[var(--cat-border)] bg-white/95 px-3 pb-2.5 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-catalog-display truncate text-[1.25rem] font-semibold leading-none">
                  {catalog.name}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--cat-muted)]">
                  {catalog.tagline}
                </p>
              </div>
              <span className="inline-flex min-h-8 shrink-0 items-center rounded-[10px] bg-[var(--cat-ink)] px-2.5 text-[11px] font-bold text-white">
                Table 5
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-3 pt-3">
            <div className="rounded-[14px] bg-[var(--cat-ink)] px-3 py-3 text-white">
              <p className="font-catalog-display text-[1.125rem] font-semibold leading-none">Table 5</p>
              <p className="mt-1 text-[11px] text-white/70">{catalog.settings.floor.name}</p>
              <div className="mt-2.5 flex gap-1.5">
                <span className="rounded-[9px] border border-white/25 px-2.5 py-1.5 text-[11px] font-bold">
                  Call waiter
                </span>
                <span className="rounded-[9px] border border-white/25 px-2.5 py-1.5 text-[11px] font-bold">
                  Request bill
                </span>
              </div>
            </div>
            <p className="mb-1.5 mt-3 font-catalog-display text-[0.9375rem] font-semibold">{featuredTitle}</p>
            <div className="flex gap-1.5">
              {featured.map((item) => (
                <div
                  key={item.id}
                  className="w-[6.5rem] shrink-0 overflow-hidden rounded-[9px] border border-[var(--cat-border)] bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="h-[4.5rem] w-full bg-[var(--cat-photo-bg)] object-cover"
                  />
                  <div className="px-1.5 py-1">
                    <p className="line-clamp-2 text-[11px] font-semibold leading-snug">{item.name}</p>
                    <p className="mt-0.5 text-[11px] font-semibold">{formatMoney(item.price, catalog.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-col">
              {rest.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 border-t border-[var(--cat-border)] py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold">{item.name}</p>
                    <p className="truncate text-[10px] text-[var(--cat-muted)]">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold">
                    {formatMoney(item.price, catalog.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--cat-border)] bg-white/95 px-3 pb-5 pt-2">
            <span className="flex h-11 items-center justify-between rounded-[13px] bg-[var(--cat-photo-bg)] px-3 text-[12px] font-bold text-[var(--cat-muted)]">
              <span>Send to kitchen</span>
              <span>Add dishes</span>
            </span>
          </div>
        </div>
      </PhoneFrame>
      <p className="mt-1 text-center text-[0.8125rem]">
        <Link href={HARBOR_LIVE_PATH} className="mkt-press font-medium text-[var(--cat-accent)]">
          See it live
        </Link>
        <span className="text-[var(--cat-muted)]">
          {" "}
          — Harbor Kitchen is a demo, not a real restaurant
        </span>
      </p>
    </div>
  );
}
