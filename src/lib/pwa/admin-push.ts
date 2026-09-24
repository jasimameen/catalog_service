"use client";

import { firebaseVapidKey, firebaseWebConfig } from "./web-config";
import { isIosSafari, isStandaloneDisplay, openAddToHomeScreen } from "./install";

const SW_PATH = "/sw.js";
const SW_SCOPE = "/";

export type EnablePushResult = {
  permission: NotificationPermission | "unsupported";
  registered: boolean;
  error?: string;
  needsHomeScreen?: boolean;
};

export async function registerAdminServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: SW_SCOPE,
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("admin service worker register failed", error);
    return null;
  }
}

export async function notificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function enableAdminPush(): Promise<EnablePushResult> {
  if (isIosSafari() && !isStandaloneDisplay()) {
    openAddToHomeScreen();
    return {
      permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
      registered: false,
      needsHomeScreen: true,
      error: "On iPhone, add to Home Screen first. Open that icon, then tap Notify.",
    };
  }

  if (typeof Notification === "undefined") {
    return {
      permission: "unsupported",
      registered: false,
      error: "This browser cannot show alerts.",
    };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return {
      permission: Notification.permission,
      registered: false,
      error: "Could not ask for notification permission.",
    };
  }

  if (permission !== "granted") {
    return {
      permission,
      registered: false,
      error:
        permission === "denied"
          ? "Notifications are blocked for this site. Enable them in the browser settings."
          : "Permission was not granted.",
    };
  }

  const sync = await syncAdminPushToken();
  return { permission, registered: sync.ok, error: sync.error };
}

/** Refresh the FCM web token when permission is already granted. Not a permission prompt. */
export async function syncAdminPushToken(): Promise<{ ok: boolean; error?: string }> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return { ok: false, error: "Notifications are not allowed yet." };
  }
  const config = firebaseWebConfig();
  const vapidKey = firebaseVapidKey();
  if (!config || !vapidKey) {
    return {
      ok: false,
      error: "Web push is not configured (missing NEXT_PUBLIC_FIREBASE_* or VAPID key).",
    };
  }

  const registration =
    (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ?? (await registerAdminServiceWorker());
  if (!registration) {
    return { ok: false, error: "Could not register the background worker for alerts." };
  }

  try {
    await navigator.serviceWorker.ready;
    const { initializeApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) {
      return { ok: false, error: "Background alerts are not supported in this browser." };
    }

    const app = getApps()[0] ?? initializeApp(config);
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return { ok: false, error: "Firebase did not return a push token." };

    const response = await fetch("/api/admin/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: "web" }),
    });
    if (!response.ok) {
      let message = "Could not register this device.";
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // keep default
      }
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get a push token.";
    console.error("admin push token sync failed", error);
    return { ok: false, error: message };
  }
}
