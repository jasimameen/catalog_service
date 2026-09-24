import "server-only";
import { PRODUCT_DOMAIN } from "@/lib/brand";
import { incomingHrefFromPushData } from "@/lib/catalog/incoming-ticket";
import { getServiceClient } from "@/lib/supabase/service";

let appPromise: Promise<import("firebase-admin/app").App | null> | null = null;

const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * Lazily initializes firebase-admin from FIREBASE_PROJECT_ID /
 * FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (the three fields from the
 * service account JSON downloaded in the Firebase console — Project
 * settings → Service accounts → Generate new private key).
 *
 * Returns null when those aren't set. Callers must treat that as a failed
 * send — FCM never leaves the server without all three.
 */
async function getFirebaseApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const missing = [
        !projectId ? "FIREBASE_PROJECT_ID" : null,
        !clientEmail ? "FIREBASE_CLIENT_EMAIL" : null,
        !privateKey ? "FIREBASE_PRIVATE_KEY" : null,
      ].filter((name): name is string => Boolean(name));
      if (missing.length > 0) {
        console.error(`push send skipped: missing ${missing.join(", ")}`);
        return null;
      }
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

export type PushSendResult = {
  ok: boolean;
  reason?: "not_configured" | "no_tokens" | "send_failed";
  sent?: number;
  failed?: number;
};

/**
 * Sends a push to every device registered for this account.
 * Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * is a failed send (logged), not a quiet success.
 */
export async function sendPushToAccount(accountId: string, notification: PushNotification): Promise<PushSendResult> {
  try {
    const app = await getFirebaseApp();
    if (!app) return { ok: false, reason: "not_configured" };

    const service = getServiceClient();
    const { data: tokens } = await service
      .from("mobile_push_tokens")
      .select("token")
      .eq("account_id", accountId);
    if (!tokens || tokens.length === 0) return { ok: false, reason: "no_tokens" };

    const data = withPushHref(notification.data);
    const { getMessaging } = await import("firebase-admin/messaging");
    const messaging = getMessaging(app);
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((row) => row.token),
      notification: { title: notification.title, body: notification.body },
      data,
      apns: { payload: { aps: { sound: "default" } } },
      android: { priority: "high" },
      webpush: {
        headers: { Urgency: "high" },
        fcmOptions: { link: absoluteAdminUrl(data.href) },
        notification: {
          icon: absoluteAdminUrl("/icons/icon-192.png"),
          badge: absoluteAdminUrl("/icons/badge-96.png"),
        },
      },
    });

    const stale: string[] = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code ?? "unknown";
      const token = tokens[index].token;
      console.error("push send failed for token", code, result.error?.message);
      if (STALE_TOKEN_CODES.has(code)) stale.push(token);
    });
    if (stale.length > 0) {
      await service.from("mobile_push_tokens").delete().in("token", stale);
    }

    const failed = response.failureCount;
    if (failed > 0 && response.successCount === 0) {
      return { ok: false, reason: "send_failed", sent: response.successCount, failed };
    }
    return { ok: response.successCount > 0, sent: response.successCount, failed };
  } catch (error) {
    console.error("push send failed", error);
    return { ok: false, reason: "send_failed" };
  }
}

function withPushHref(data?: Record<string, string>): Record<string, string> {
  const next = { ...(data ?? {}) };
  next.href = incomingHrefFromPushData(next);
  return next;
}

function absoluteAdminUrl(path: string): string {
  const host = process.env.NEXT_PUBLIC_ROOT_DOMAIN || PRODUCT_DOMAIN;
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}
