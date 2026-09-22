"use client";

import { firebaseVapidKey, firebaseWebConfig } from "./web-config";

const SW_PATH = "/sw.js";
const SW_SCOPE = "/";

export async function registerAdminServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE, updateViaCache: "none" });
  } catch {
    return null;
  }
}

export async function notificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function enableAdminPush(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await syncAdminPushToken();
  }
  return permission;
}

/** Refresh the FCM web token when permission is already granted. Not a permission prompt. */
export async function syncAdminPushToken(): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const config = firebaseWebConfig();
  const vapidKey = firebaseVapidKey();
  if (!config || !vapidKey) return false;

  const registration = (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ?? (await registerAdminServiceWorker());
  if (!registration) return false;

  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return false;

    const app = getApps()[0] ?? initializeApp(config);
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return false;

    const response = await fetch("/api/admin/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: "web" }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
