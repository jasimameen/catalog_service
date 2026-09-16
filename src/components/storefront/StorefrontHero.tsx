import type { CatalogBanner } from "@/lib/supabase/types";

export function StorefrontHero({ banners }: { banners: CatalogBanner[] }) {
  if (banners.length === 0) return null;

  return (
    <section
      aria-label="Promotions"
      className="flex snap-x snap-mandatory overflow-x-auto"
    >
      {banners.map((banner, index) => (
        <div
          key={`${banner.image}-${index}`}
          className="relative aspect-[16/7] min-w-full snap-center bg-[var(--cat-photo-bg)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- merchant banner URL */}
          <img
            src={banner.image}
            alt={banner.alt || ""}
            width={1600}
            height={700}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ))}
    </section>
  );
}
