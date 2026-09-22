"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function SettingsFold({ children }: { children: ReactNode }) {
  const foldRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const fold = foldRef.current;
    if (!fold) return;
    const apply = () => {
      const hash = window.location.hash;
      if (hash === "#look" || hash === "#ordering" || hash === "#hours" || hash === "#branches") {
        fold.open = true;
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return (
    <details
      ref={foldRef}
      className="group min-w-0 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,23,32,0.04)]"
    >
      <summary className="ops-press flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold tracking-tight sm:px-[18px] [&::-webkit-details-marker]:hidden">
        Settings
        <span className="text-[13px] font-normal text-[#86868b] group-open:hidden">Hours, branch, look</span>
        <span className="hidden text-[13px] font-normal text-[#86868b] group-open:inline">Hide</span>
      </summary>
      <div className="flex min-w-0 flex-col gap-3 px-2 pb-3 sm:px-3">{children}</div>
    </details>
  );
}
