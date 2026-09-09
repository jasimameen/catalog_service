import type { StorefrontCatalog } from "@/lib/catalog/types";

export function BrandHeader({
  catalog,
  nameClassName = "font-catalog-display text-lg font-bold leading-tight text-[var(--cat-accent)]",
}: {
  catalog: StorefrontCatalog;
  nameClassName?: string;
}) {
  const logo = (catalog.logo ?? "").trim();
  const tagline = (catalog.tagline ?? "").trim();
  const about = (catalog.about ?? "").trim();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // User-pasted https/data URLs are not in next/image remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg bg-[var(--cat-photo-bg)] object-contain"
        />
      ) : null}
      <div className="min-w-0">
        <p className={`truncate ${nameClassName}`}>{catalog.name}</p>
        {tagline ? (
          <p className="truncate text-xs text-[var(--cat-muted)]">{tagline}</p>
        ) : null}
        {about ? (
          <p className="kl-line-clamp-2 text-[11px] leading-snug text-[var(--cat-muted)]">{about}</p>
        ) : null}
      </div>
    </div>
  );
}
