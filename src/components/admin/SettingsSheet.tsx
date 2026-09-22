"use client";

import { useEffect, type ReactNode } from "react";

export function SettingsSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(16,23,32,0.4)] md:items-center md:p-6">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-sheet-title"
        className="settings-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[18px] bg-white shadow-[0_18px_50px_rgba(16,23,32,0.18)] md:max-h-[86dvh] md:rounded-[18px]"
      >
        <div className="ops-glass sticky top-0 z-[1] flex items-start gap-3 border-b border-[#edf0f4] px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2
              id="settings-sheet-title"
              className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-[var(--cat-ink)]"
            >
              {title}
            </h2>
            {subtitle ? <p className="m-0 mt-0.5 text-[13px] text-[#86868b]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ops-press grid h-11 w-11 place-items-center rounded-full bg-[#f4f6f9] text-lg text-[var(--cat-ink)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
