import type { StorefrontComboLine } from "@/lib/catalog/types";
import { formatComboIncludes } from "@/lib/catalog/combos";

/**
 * Quiet “what’s in the combo” stack — thumbs + name + qty.
 * Never shows child prices; the combo card/modal owns the single price.
 */
export function ComboIncludes({
  lines,
  items,
  layout = "wrap",
  size = "sm",
  className = "",
}: {
  lines?: StorefrontComboLine[];
  items?: StorefrontComboLine[];
  layout?: "wrap" | "list" | "inline";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const rows = lines ?? items ?? [];
  if (rows.length === 0) return null;

  if (layout === "inline") {
    const thumbs = rows.filter((line) => line.image).slice(0, 3);
    return (
      <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>
        {thumbs.length > 0 ? (
          <span className="flex h-3.5 shrink-0 -space-x-1 print:hidden">
            {thumbs.map((line) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={line.id || line.name}
                src={line.image}
                alt=""
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded-[3px] object-cover ring-1 ring-white"
              />
            ))}
          </span>
        ) : null}
        <span className="truncate text-[11px] leading-4 text-[var(--cat-muted)]">
          {formatComboIncludes(rows)}
        </span>
      </span>
    );
  }

  const large = size === "md" || size === "lg";
  const thumb = large ? "h-10 w-10" : "h-8 w-8";
  const type = large ? "text-[12px] leading-snug" : "text-[11px] leading-tight";
  const listClass =
    layout === "list"
      ? "flex flex-col gap-1.5"
      : "flex flex-wrap items-center gap-x-2.5 gap-y-1.5";

  return (
    <ul className={`${listClass} ${className}`}>
      {rows.map((line) => (
        <li key={line.id || line.name} className={`flex min-w-0 max-w-full items-center gap-1.5 ${type} text-[var(--cat-muted)]`}>
          <span className={`${thumb} relative shrink-0 overflow-hidden rounded-[7px] bg-[var(--cat-photo-bg)] print:hidden`}>
            {line.image ? (
              // User-pasted https/data URLs are not in next/image remotePatterns.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={line.image}
                alt=""
                width={large ? 40 : 32}
                height={large ? 40 : 32}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0 truncate">
            {line.qty > 1 ? `${line.qty}× ${line.name}` : line.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
