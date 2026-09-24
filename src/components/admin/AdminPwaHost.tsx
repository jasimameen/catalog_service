"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PRODUCT_NAME } from "@/lib/brand";
import { registerAdminServiceWorker, syncAdminPushToken } from "@/lib/pwa/admin-push";
import {
  OPEN_A2HS_EVENT,
  isIosSafari,
  isMobileInstallSurface,
  isStandaloneDisplay,
  readA2hsDismissed,
  writeA2hsDismissed,
} from "@/lib/pwa/install";
import { rememberLastCatalog } from "@/lib/pwa/last-catalog";

const RESERVED = new Set(["settings", "account", "inquiries", "ops"]);

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function catalogIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const second = segments[1];
  if (segments[0] !== "admin" || !second || RESERVED.has(second)) return null;
  return second;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AdminPwaHost() {
  const pathname = usePathname();
  const [standalone, setStandalone] = useState(false);
  const [mobileSurface, setMobileSurface] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [sheet, setSheet] = useState<"ios" | "android" | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const installEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const catalogId = catalogIdFromPath(pathname);
    if (catalogId) rememberLastCatalog(catalogId);
  }, [pathname]);

  useEffect(() => {
    void registerAdminServiceWorker();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void syncAdminPushToken();
    }

    function onSwMessage(event: MessageEvent) {
      const href = event.data?.href;
      if (event.data?.type === "hv-open" && typeof href === "string" && href.startsWith("/admin")) {
        window.location.assign(href);
      }
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    const installed = isStandaloneDisplay();
    setStandalone(installed);
    const mobile = isMobileInstallSurface();
    setMobileSurface(mobile);
    if (!installed && mobile && !readA2hsDismissed()) setShowCta(true);

    function syncSurface() {
      const nextMobile = isMobileInstallSurface();
      setMobileSurface(nextMobile);
      if (!nextMobile) {
        setShowCta(false);
        setSheet(null);
      } else if (!isStandaloneDisplay() && !readA2hsDismissed()) {
        setShowCta(true);
      }
    }
    const narrow = window.matchMedia("(max-width: 700px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    narrow.addEventListener("change", syncSurface);
    coarse.addEventListener("change", syncSurface);

    function onInstall(event: Event) {
      event.preventDefault();
      const pending = event as BeforeInstallPromptEvent;
      installEventRef.current = pending;
      setInstallEvent(pending);
    }
    function onInstalled() {
      installEventRef.current = null;
      setInstallEvent(null);
      setShowCta(false);
      setSheet(null);
      setStandalone(true);
    }
    function onOpenSheet() {
      if (isStandaloneDisplay() || !isMobileInstallSurface()) return;
      setShowCta(true);
      setSheet(isIosSafari() ? "ios" : installEventRef.current ? null : "android");
      if (!isIosSafari() && installEventRef.current) {
        void promptAndroidInstall();
      }
    }

    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_A2HS_EVENT, onOpenSheet);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_A2HS_EVENT, onOpenSheet);
      narrow.removeEventListener("change", syncSurface);
      coarse.removeEventListener("change", syncSurface);
    };
  }, []);

  async function promptAndroidInstall() {
    const pending = installEventRef.current ?? installEvent;
    if (!pending) {
      setSheet("android");
      return;
    }
    try {
      await pending.prompt();
      await pending.userChoice;
    } catch {
      // user dismissed the native sheet
    }
    installEventRef.current = null;
    setInstallEvent(null);
  }

  function dismissCta() {
    writeA2hsDismissed();
    setShowCta(false);
    setSheet(null);
  }

  function onCtaClick() {
    if (!isMobileInstallSurface()) return;
    if (isIosSafari()) {
      setSheet("ios");
      return;
    }
    void promptAndroidInstall();
  }

  if (standalone || !mobileSurface) return null;

  return (
    <>
      {showCta ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto flex w-full max-w-[26rem] items-center gap-2">
            <button
              type="button"
              onClick={onCtaClick}
              className="a2hs-cta ops-press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold tracking-[-0.01em] text-[var(--cat-ink)]"
            >
              <HomeGlyph />
              Add to Home Screen
            </button>
            <button
              type="button"
              onClick={dismissCta}
              className="a2hs-cta ops-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#5a6472]"
              aria-label="Dismiss add to Home Screen"
            >
              <CloseGlyph />
            </button>
          </div>
        </div>
      ) : null}

      {sheet ? (
        <AddToHomeSheet
          kind={sheet}
          onClose={() => setSheet(null)}
          onDismissForever={dismissCta}
        />
      ) : null}
    </>
  );
}

function AddToHomeSheet({
  kind,
  onClose,
  onDismissForever,
}: {
  kind: "ios" | "android";
  onClose: () => void;
  onDismissForever: () => void;
}) {
  const reduced = prefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const history = useRef<{ y: number; t: number }[]>([]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function close() {
    if (reduced) {
      onClose();
      return;
    }
    setOpen(false);
    window.setTimeout(onClose, 320);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    startY.current = event.clientY;
    history.current = [{ y: event.clientY, t: performance.now() }];
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dy = Math.max(0, event.clientY - startY.current);
    setOffset(dy);
    history.current.push({ y: event.clientY, t: performance.now() });
    if (history.current.length > 5) history.current.shift();
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    const hist = history.current;
    let velocity = 0;
    if (hist.length >= 2) {
      const first = hist[0];
      const last = hist[hist.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0) velocity = (last.y - first.y) / dt;
    }
    const projected = offset + (velocity / 1000) * (0.998 / (1 - 0.998));
    if (offset > 88 || velocity > 700 || projected > 140) {
      close();
    }
    setOffset(0);
  }

  const translate = open ? offset : 1100;
  const sheetStyle = reduced
    ? { opacity: open ? 1 : 0 }
    : { transform: `translate3d(0, ${typeof translate === "number" ? `${translate}px` : translate}, 0)` };

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className={`a2hs-scrim absolute inset-0 ${open ? "opacity-100" : "opacity-0"}`}
        aria-label="Close"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2hs-title"
        data-open={open}
        data-dragging={dragging}
        data-reduced={reduced}
        className="a2hs-sheet absolute inset-x-0 bottom-0 mx-auto w-full max-w-[26rem] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={sheetStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="a2hs-material overflow-hidden rounded-[22px]">
          <div className="flex justify-center pt-2.5">
            <span className="h-1 w-9 rounded-full bg-black/18" aria-hidden />
          </div>
          <div className="px-5 pb-5 pt-3">
            <p id="a2hs-title" className="m-0 text-[20px] font-semibold tracking-[-0.03em] text-[var(--cat-ink)]">
              Add to Home Screen
            </p>
            <p className="m-0 mt-1 text-[14px] leading-snug text-[#5a6472]">
              {kind === "ios"
                ? `Open ${PRODUCT_NAME} from the Home Screen icon so alerts still reach you when Safari is closed.`
                : `Install ${PRODUCT_NAME} so orders and table calls still reach you when Chrome is closed.`}
            </p>

            {kind === "ios" ? <IosSteps /> : <AndroidSteps />}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={onDismissForever} className="ops-press min-h-11 px-3 text-[14px] text-[#5a6472]">
                Not now
              </button>
              <button
                type="button"
                onClick={close}
                className="ops-press min-h-11 rounded-full bg-[var(--cat-ink)] px-4 text-[14px] font-semibold text-white"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IosSteps() {
  return (
    <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
      <Step n={1} icon={<IosShareGlyph />} label="Tap Share" detail="The square with the arrow, in the Safari toolbar." />
      <Step n={2} icon={<IosAddGlyph />} label="Add to Home Screen" detail="Scroll the share sheet, then tap that row." />
      <Step n={3} icon={<HomeGlyph />} label="Open the icon" detail="Then tap Notify so alerts can reach this phone." />
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
      <Step n={1} icon={<AndroidMenuGlyph />} label="Open the Chrome menu" detail="The three dots at the top right." />
      <Step n={2} icon={<HomeGlyph />} label="Install app" detail="Or Add to Home screen, then confirm." />
    </ol>
  );
}

function Step({ n, icon, label, detail }: { n: number; icon: ReactNode; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#0b5fce]/10 text-[#0b5fce]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold tracking-[-0.015em] text-[var(--cat-ink)]">
          {n}. {label}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#5a6472]">{detail}</span>
      </span>
    </li>
  );
}

function HomeGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.2 8.1 9 3.4l5.8 4.7v6.2A1.3 1.3 0 0 1 13.5 15.6h-9A1.3 1.3 0 0 1 3.2 14.3V8.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.2 2.2 11.8 11.8M11.8 2.2 2.2 11.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IosShareGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 2.4v8.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5.8 5.4 9 2.3l3.2 3.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4.2 8.2v5.6A1.5 1.5 0 0 0 5.7 15.3h6.6a1.5 1.5 0 0 0 1.5-1.5V8.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IosAddGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="3.1" y="3.1" width="11.8" height="11.8" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 6.2v5.6M6.2 9h5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AndroidMenuGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="4.2" r="1.15" fill="currentColor" />
      <circle cx="9" cy="9" r="1.15" fill="currentColor" />
      <circle cx="9" cy="13.8" r="1.15" fill="currentColor" />
    </svg>
  );
}
