"use client";

import Link from "next/link";

const STEP_LABELS = ["Items", "Look", "Address"];

interface TopBarProps {
  step: 1 | 2 | 3;
}

/** Top bar: back to /admin, 3 numbered step pills, cosmetic "Draft saved". */
export function TopBar({ step }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-[#e8e8ed] bg-white/85 px-4 backdrop-blur-xl sm:px-6">
      <Link href="/admin" className="flex-shrink-0 text-[13px] text-[#6e6e73]">
        ← Catalogs
      </Link>
      <div className="flex items-center gap-2 overflow-x-auto sm:gap-2.5">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          return (
            <div key={label} className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              <span
                className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full text-[11px] font-semibold"
                style={{
                  background: active ? "#1d1d1f" : "#e8e8ed",
                  color: active ? "#ffffff" : "#86868b",
                }}
              >
                {n}
              </span>
              <span
                className="hidden text-[13px] sm:inline"
                style={{ color: active ? "#1d1d1f" : "#86868b" }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <span className="hidden flex-shrink-0 text-[13px] text-[#86868b] sm:inline">
        Draft saved
      </span>
    </header>
  );
}
