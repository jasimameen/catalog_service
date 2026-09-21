import "server-only";
import { getServiceClient } from "@/lib/supabase/service";

let appPromise: Promise<import("firebase-admin/app").App | null> | null = null;

/**
 * Lazily initializes firebase-admin from FIREBASE_PROJECT_ID /
 * FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (the three fields from the
 * service account JSON downloaded in the Firebase console — Project
 * settings → Service accounts → Generate new private key).
 *
 * Returns null (never throws) when those aren't set yet, so every call
 * site can push-and-forget without gating on "is Firebase configured".
 */
async function getFirebaseApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      if (!projectId || !clientEmail || !privateKey) return null;

      try {
        const { initializeApp, getApps, cert } = await import("firebase-admin/app");
        const existing = getApps();
        if (existing.length > 0) return existing[0];
        return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      } catch (error) {
        console.error("firebase-admin init failed", error);
        return null;
      }
    })();
  }
  return appPromise;
}

export type PushNotification = {
  title: string;
  body: string;
  /** Extra fields the app's notification handler switches on, e.g. { kind: "new_order", orderId }. */
  data?: Record<string, string>;
};

/**
 * Sends a push to every device registered for this account. Silently does
 * nothing (and logs once) until Firebase credentials are configured, and
 * drops any token FCM reports as no-longer-registered.
 */
export async function sendPushToAccount(accountId: string, notification: PushNotification): Promise<void> {
  try {
    const app = await getFirebaseApp();
    if (!app) return; // Firebase isn't configured yet — see MOBILE_FIREBASE_SETUP.md.

    const service = getServiceClient();
    const { data: tokens } = await service
      .from("mobile_push_tokens")
      .select("token")
      .eq("account_id", accountId);
    if (!tokens || tokens.length === 0) return;

    const { getMessaging } = await import("firebase-admin/messaging");
    const messaging = getMessaging(app);
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((row) => row.token),
      notification: { title: notification.title, body: notification.body },
      data: notification.data ?? {},
      apns: { payload: { aps: { sound: "default" } } },
      android: { priority: "high" },
    });

    const stale = response.responses
      .map((result, index) => (result.success ? null : tokens[index].token))
      .filter((token): token is string => Boolean(token));
    if (stale.length > 0) {
      await service.from("mobile_push_tokens").delete().in("token", stale);
    }
  } catch (error) {
    console.error("push send failed", error);
  }
}
