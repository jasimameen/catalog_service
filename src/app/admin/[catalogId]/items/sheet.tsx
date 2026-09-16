"use client";

import { useEffect, type ReactNode } from "react";

export const fieldLabel = "text-[12px] font-medium text-[#5a6472]";
export const fieldInput =
  "min-h-11 w-full rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3 text-[14px] outline-none focus:border-[#0b5fce]";
export const fieldSelect =
  "min-h-11 w-full rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-2.5 text-[14px] outline-none focus:border-[#0b5fce]";
export const btnGhost =
  "min-h-11 rounded-[11px] border border-[#e2e7ee] bg-white px-3.5 text-[13px] font-medium text-[#101720] hover:border-[#c3ccd9] disabled:opacity-50";
export const btnPrimary =
  "min-h-11 rounded-[11px] bg-[#0b5fce] px-4 text-[13px] font-medium text-white hover:bg-[#0a4aa0] disabled:opacity-50";
export const btnDanger =
  "min-h-11 rounded-[11px] bg-[#b42318] px-[18px] text-[14px] font-medium text-white disabled:opacity-50";

export function AdminSheet({
  onClose,
  maxWidth = "max-w-[440px]",
  labelledBy,
  children,
}: {
  onClose: () => void;
  maxWidth?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <style>{`@keyframes itemsSheetUp{from{transform:translateY(16px);opacity:.5}to{transform:translateY(0);opacity:1}}`}</style>
      <div
        className={`flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-[18px] border border-[#e2e7ee] bg-white sm:rounded-2xl`}
        style={{ animation: "itemsSheetUp 0.18s ease-out" }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminSheetHeader({
  id,
  title,
  helper,
  onClose,
}: {
  id?: string;
  title: string;
  helper?: string;
  onClose: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-[#edf0f4] bg-white px-[18px] py-4">
      <div className="min-w-0 flex-1">
        <h3 id={id} className="m-0 text-[17px] font-semibold tracking-tight text-[#101720]">
          {title}
        </h3>
        {helper ? (
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">{helper}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border border-[#e2e7ee] bg-white text-[20px] leading-none text-[#5a6472]"
      >
        ×
      </button>
    </div>
  );
}

export function AdminSheetBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] py-[18px]">{children}</div>
  );
}

export function AdminSheetFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2.5 border-t border-[#edf0f4] bg-white px-[18px] py-3.5">
      {children}
    </div>
  );
}
