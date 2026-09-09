import type { CatalogTemplateKey, DraftItem } from "./types";

interface TemplatePreviewProps {
  template: CatalogTemplateKey;
  accent: string;
  catalogName: string;
  currency: string;
  items: DraftItem[];
  liveUrl: string;
}

/**
 * A small bespoke preview of the chosen template's shape — deliberately NOT
 * the real src/components/templates/*.tsx renderers (those expect a full
 * StorefrontCatalog with real DB ids, cart state, etc., and this task's
 * scope excludes touching src/components/templates/**). Mirrors the
 * `previewShape` config from design/raw/Catalog Builder.dc.html: grid and
 * lookbook show photo+text cards, menu is a photo-optional row list,
 * pricelist is a plain text-only row list.
 */
export function TemplatePreview({
  template,
  accent,
  catalogName,
  currency,
  items,
  liveUrl,
}: TemplatePreviewProps) {
  const shape = SHAPES[template];
  const preview = items.slice(0, shape.count);

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_48px_-28px_rgba(0,0,0,0.4)]">
      <div className="border-b border-[#e8e8ed] bg-[#fbfbfd] px-3 py-2 text-center text-[11px] text-[#6e6e73]">
        {liveUrl}
      </div>
      <div className="p-[18px]">
        <div
          className="flex items-baseline justify-between border-b border-[#e8e8ed] pb-3"
          style={{ color: accent }}
        >
          <span className="text-[15px] font-bold tracking-[-0.01em]">
            {catalogName || "Your catalog"}
          </span>
          <span
            className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: accent }}
          >
            Cart 0
          </span>
        </div>

        {preview.length === 0 ? (
          <p className="pt-6 text-center text-[12px] text-[#86868b]">
            Items you add will show up here.
          </p>
        ) : (
          <div className={shape.wrapperClass} style={shape.wrapperStyle}>
            {preview.map((item) => (
              <PreviewCard
                key={item.tempId}
                item={item}
                shape={shape}
                currency={currency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewCard({
  item,
  shape,
  currency,
}: {
  item: DraftItem;
  shape: (typeof SHAPES)[CatalogTemplateKey];
  currency: string;
}) {
  const priceLabel = `${currency} ${item.price.toFixed(2)}`;

  if (shape.layout === "block") {
    return (
      <div className="overflow-hidden rounded-[10px] border border-[#e8e8ed]">
        {shape.showPhoto && (
          <div className="aspect-[584/480] w-full bg-[#eef1f5]">
            {item.image ? (
              // Draft items may hold a local data: URL, which next/image
              // can't optimize; a plain <img> keeps this preview dependency-free.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>
        )}
        <div className="px-2.5 pt-2.5">
          <p className="truncate text-[12px] font-semibold text-[#1d1d1f]">{item.name}</p>
        </div>
        <p className="px-2.5 pb-2.5 pt-0.5 text-[13px] font-semibold text-[#1d1d1f]">
          {priceLabel}
        </p>
      </div>
    );
  }

  // "row" layout — used by menu (photo optional) and pricelist (no photo).
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-[#e8e8ed] p-2">
      {shape.showPhoto && (
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-[6px] bg-[#eef1f5]">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" className="h-full w-full object-contain" />
          ) : null}
        </div>
      )}
      <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1d1d1f]">
        {item.name}
      </p>
      <p className="flex-shrink-0 text-[13px] font-semibold text-[#1d1d1f]">{priceLabel}</p>
    </div>
  );
}

const SHAPES: Record<
  CatalogTemplateKey,
  {
    layout: "block" | "row";
    showPhoto: boolean;
    count: number;
    wrapperClass: string;
    wrapperStyle?: React.CSSProperties;
  }
> = {
  grid: {
    layout: "block",
    showPhoto: true,
    count: 6,
    wrapperClass: "grid grid-cols-2 gap-2.5 pt-3.5",
  },
  lookbook: {
    layout: "block",
    showPhoto: true,
    count: 2,
    wrapperClass: "grid grid-cols-1 gap-2.5 pt-3.5",
  },
  menu: {
    layout: "row",
    showPhoto: true,
    count: 5,
    wrapperClass: "flex flex-col gap-2.5 pt-3.5",
  },
  pricelist: {
    layout: "row",
    showPhoto: false,
    count: 6,
    wrapperClass: "flex flex-col gap-2.5 pt-3.5",
  },
  cards: {
    layout: "block",
    showPhoto: true,
    count: 2,
    wrapperClass: "grid grid-cols-1 gap-2.5 pt-3.5",
  },
  compact: {
    layout: "row",
    showPhoto: true,
    count: 6,
    wrapperClass: "flex flex-col gap-2.5 pt-3.5",
  },
  spotlight: {
    layout: "block",
    showPhoto: true,
    count: 4,
    wrapperClass: "grid grid-cols-2 gap-2.5 pt-3.5",
  },
};
