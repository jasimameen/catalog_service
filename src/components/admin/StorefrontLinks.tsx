import Link from "next/link";
import { CopyLinkButton } from "./CopyLinkButton";

export function StorefrontLinks({
  menuUrl,
  dineUrl,
  reserveUrl,
  shareHref,
  showDine,
  showReserve,
}: {
  menuUrl: string;
  dineUrl: string;
  reserveUrl: string;
  shareHref: string;
  showDine: boolean;
  showReserve: boolean;
}) {
  const menuHost = menuUrl.replace(/^https?:\/\//, "");
  const dineHost = dineUrl.replace(/^https?:\/\//, "");

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[13px] text-[#86868b]">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">Menu</span>
        <span className="truncate font-mono text-[12px]">{menuHost}</span>
        <CopyLinkButton url={menuUrl} label="Copy menu" className="ops-press min-h-9 bg-transparent px-0 text-[13px] text-[#5a6472]" />
        <a href={menuUrl} target="_blank" rel="noreferrer" className="ops-press inline-flex min-h-9 items-center text-[13px] text-[#0b5fce] no-underline">
          View
        </a>
        <Link href={shareHref} className="ops-press inline-flex min-h-9 items-center text-[13px] text-[#5a6472] no-underline">
          QR
        </Link>
      </div>
      {showDine ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">Dine-in</span>
          <span className="truncate font-mono text-[12px]">{dineHost}</span>
          <CopyLinkButton url={dineUrl} label="Copy dine-in" className="ops-press min-h-9 bg-transparent px-0 text-[13px] text-[#5a6472]" />
          <a href={dineUrl} target="_blank" rel="noreferrer" className="ops-press inline-flex min-h-9 items-center text-[13px] text-[#0b5fce] no-underline">
            View
          </a>
        </div>
      ) : null}
      {showReserve ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">Reserve</span>
          <CopyLinkButton url={reserveUrl} label="Copy reserve" className="ops-press min-h-9 bg-transparent px-0 text-[13px] text-[#5a6472]" />
          <a href={reserveUrl} target="_blank" rel="noreferrer" className="ops-press inline-flex min-h-9 items-center text-[13px] text-[#0b5fce] no-underline">
            View
          </a>
        </div>
      ) : null}
    </div>
  );
}
