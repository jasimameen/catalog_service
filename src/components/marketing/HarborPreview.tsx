import Link from "next/link";
import { buildHarborKitchenCatalog, HARBOR_LIVE_PATH } from "@/lib/catalog/demo-harbor";
import { formatMoney } from "@/lib/catalog/currency";

export function HarborPreview() {
  const catalog = buildHarborKitchenCatalog();
  const featured = catalog.items.filter((item) => item.featured).slice(0, 2);
  const rest = catalog.items.filter((item) => !item.featured).slice(0, 3);

  return (
    <div className="rounded-[24px] border border-[var(--cat-border)] bg-[var(--cat-photo-bg)] p-3 sm:p-5">
      <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_24px_50px_-28px_rgba(16,23,32,0.35)]">
        <div className="flex items-center gap-2 border-b border-[var(--cat-border)] bg-[#fbfbfd] px-3 py-2">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          </span>
          <span className="flex-1 rounded-md bg-[var(--cat-bg)] px-2 py-1 text-center text-[11px] text-[var(--cat-muted)]">
            /live · {catalog.name}
          </span>
        </div>
        <div className="px-4 pb-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-catalog-display text-[22px] font-semibold leading-none">{catalog.name}</p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--cat-muted)]">{catalog.tagline}</p>
              <p className="mt-1 text-[11px] leading-snug text-[var(--cat-muted)]">{catalog.address}</p>
            </div>
            <span className="rounded-[10px] bg-[var(--cat-accent)] px-3 py-1.5 text-[11px] font-bold text-white">
              Cart
            </span>
          </div>
          <div className="mt-3 flex rounded-[10px] border border-[var(--cat-border)] bg-[var(--cat-photo-bg)] p-[3px]">
            {["Dine in", "Pickup", "Delivery"].map((mode, i) => (
              <span
                key={mode}
                className={`min-h-9 flex-1 rounded-lg px-2 text-center text-[11px] font-bold leading-9 ${
                  i === 0 ? "bg-[var(--cat-accent)] text-white" : "text-[var(--cat-muted)]"
                }`}
              >
                {mode}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
            Featured today
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {featured.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl border border-[var(--cat-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="aspect-[4/3] w-full object-cover bg-[var(--cat-photo-bg)]" />
                <div className="p-2">
                  <p className="text-[13px] font-semibold">{item.name}</p>
                  <p className="mt-0.5 text-[12px] font-medium">{formatMoney(item.price, catalog.currency)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {rest.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--cat-border)] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{item.name}</p>
                  <p className="truncate text-[11px] text-[var(--cat-muted)]">{item.description}</p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold">
                  {formatMoney(item.price, catalog.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px]">
        <Link href={HARBOR_LIVE_PATH} className="font-medium text-[var(--cat-accent)]">
          See it live
        </Link>
        <span className="text-[var(--cat-muted)]"> — the Harbor menu, hours, and Brooklyn address</span>
      </p>
    </div>
  );
}
