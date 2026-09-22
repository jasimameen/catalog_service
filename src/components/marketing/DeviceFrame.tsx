import type { ReactNode } from "react";

function Signal({ light }: { light: boolean }) {
  const fill = light ? "#12151a" : "#fff";
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden>
      <rect x="0" y="6" width="2.2" height="4" rx="0.5" fill={fill} opacity="0.45" />
      <rect x="3.6" y="4" width="2.2" height="6" rx="0.5" fill={fill} opacity="0.65" />
      <rect x="7.2" y="2" width="2.2" height="8" rx="0.5" fill={fill} opacity="0.85" />
      <rect x="10.8" y="0" width="2.2" height="10" rx="0.5" fill={fill} />
    </svg>
  );
}

function Battery({ light }: { light: boolean }) {
  const stroke = light ? "#12151a" : "#fff";
  return (
    <svg width="22" height="11" viewBox="0 0 22 11" aria-hidden>
      <rect x="0.6" y="0.6" width="18" height="9.8" rx="2.2" stroke={stroke} strokeWidth="1.2" fill="none" />
      <rect x="2.2" y="2.2" width="13.4" height="6.6" rx="1" fill={stroke} />
      <path d="M20.2 3.6v3.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Phone bezel for ops / storefront mocks. Decorative — caption is the label. */
export function PhoneFrame({
  children,
  label,
  className = "",
  chrome = "light",
  bleed = false,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  chrome?: "light" | "dark";
  /** Full-bleed screens (alarm) paint under the status bar. */
  bleed?: boolean;
}) {
  const light = chrome === "light";
  const ink = light ? "text-[#12151a]" : "text-white";

  return (
    <figure className={`mx-auto w-[min(100%,17rem)] ${className}`}>
      <div className="rounded-[2.65rem] bg-[#1c1c1e] p-[0.6rem] shadow-[0_36px_72px_-28px_rgba(16,23,32,0.55)]">
        <div className={`relative overflow-hidden rounded-[2.05rem] ${light ? "bg-[#f4f5f7]" : "bg-[#12151a]"}`}>
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex h-11 items-center justify-between px-5 text-[10px] font-semibold tabular-nums ${ink}`}
          >
            <span>9:41</span>
            <span className="absolute left-1/2 top-[0.7rem] h-[1.35rem] w-[5.6rem] -translate-x-1/2 rounded-full bg-[#0b0b0d]" />
            <span className="flex items-center gap-1">
              <Signal light={light} />
              <Battery light={light} />
            </span>
          </div>
          <div className={bleed ? "" : "pt-11"}>{children}</div>
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-10 flex justify-center">
            <span className={`h-[0.3rem] w-[6.75rem] rounded-full ${light ? "bg-[#12151a]/80" : "bg-white/80"}`} />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[0.75rem] leading-snug text-[var(--cat-muted)]">
        {label}
      </figcaption>
    </figure>
  );
}

export function TabletFrame({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="relative rounded-[1.75rem] bg-[#1c1c1e] p-3 shadow-[0_44px_88px_-32px_rgba(16,23,32,0.58)]">
        <span className="absolute left-1/2 top-[0.45rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#3a3a3c]" />
        <div className="overflow-hidden rounded-[1.05rem] bg-[#f4f5f7]">{children}</div>
      </div>
      <figcaption className="mt-3 text-center text-[0.75rem] leading-snug text-[var(--cat-muted)]">
        {label}
      </figcaption>
    </figure>
  );
}
