"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PRODUCT_NAME } from "@/lib/brand";
import { registerAdminServiceWorker, syncAdminPushToken } from "@/lib/pwa/admin-push";
import { rememberLastCatalog } from "@/lib/pwa/last-catalog";
import { OpsGhostButton, OpsPrimaryButton } from "@/components/admin/ops/OpsChrome";

const RESERVED = new Set(["settings", "account", "inquiries", "ops"]);
const IOS_TIP_KEY = "hv-admin-ios-a2hs-dismissed";
const INSTALL_TIP_KEY = "hv-admin-install-dismissed";

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

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  return iOS && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function readDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // private mode / quota
  }
}

export function AdminPwaHost() {
  const pathname = usePathname();
  const [iosTip, setIosTip] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const catalogId = catalogIdFromPath(pathname);
    if (catalogId) rememberLastCatalog(catalogId);
  }, [pathname]);

  useEffect(() => {
    void registerAdminServiceWorker();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void syncAdminPushToken();
    }

    if (isStandalone()) return;

    if (isIos() && !readDismissed(IOS_TIP_KEY)) {
      setIosTip(true);
    }

    function onInstall(event: Event) {
      event.preventDefault();
      if (readDismissed(INSTALL_TIP_KEY)) return;
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  if (iosTip) {
    return (
      <PwaTip
        title={`Add ${PRODUCT_NAME} to your Home Screen`}
        body="On iPhone, tap Share, then Add to Home Screen. Open that icon and tap Notify so new tickets still reach you when Safari is closed."
        actionLabel="Got it"
        onAction={() => {
          writeDismissed(IOS_TIP_KEY);
          setIosTip(false);
        }}
        onDismiss={() => {
          writeDismissed(IOS_TIP_KEY);
          setIosTip(false);
        }}
      />
    );
  }

  if (installEvent) {
    return (
      <PwaTip
        title={`Install ${PRODUCT_NAME}`}
        body="Add the dashboard to your home screen for full-screen orders and alerts when the tab is closed."
        actionLabel="Install"
        onAction={() => {
          const pending = installEvent;
          setInstallEvent(null);
          writeDismissed(INSTALL_TIP_KEY);
          void pending.prompt().then(() => pending.userChoice).catch(() => {
            // user dismissed the native sheet
          });
        }}
        onDismiss={() => {
          writeDismissed(INSTALL_TIP_KEY);
          setInstallEvent(null);
        }}
      />
    );
  }

  return null;
}

function PwaTip({
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-[26rem] overflow-hidden rounded-[16px] bg-white shadow-[0_12px_36px_rgba(16,23,32,0.16)]">
        <div className="ops-glass px-4 py-3.5">
          <p className="m-0 text-[15px] font-semibold tracking-[-0.02em] text-[var(--cat-ink)]">{title}</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">{body}</p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <OpsGhostButton onClick={onDismiss}>Not now</OpsGhostButton>
            <OpsPrimaryButton onClick={onAction}>{actionLabel}</OpsPrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
