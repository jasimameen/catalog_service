import crypto from "node:crypto";
import { mapLemonStatus } from "@/lib/billing/status";
import { getServiceClient } from "@/lib/supabase/service";
import type { AccountRow, LsStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";

const HANDLED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_expired",
  "subscription_payment_success",
]);

type WebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: { account_id?: string };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      customer_id?: number | string;
      subscription_id?: number | string;
      status?: string;
      renews_at?: string | null;
      ends_at?: string | null;
    };
  };
};

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const digest = Buffer.from(crypto.createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(header, "utf8");
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

function subscriptionIdFrom(payload: WebhookPayload): string | null {
  if (payload.data?.type === "subscriptions" && payload.data.id) {
    return String(payload.data.id);
  }
  const fromInvoice = payload.data?.attributes?.subscription_id;
  return fromInvoice != null ? String(fromInvoice) : null;
}

function statusForEvent(event: string, lsStatus: string | undefined): LsStatus {
  if (event === "subscription_expired" || event === "subscription_cancelled") return "cancelled";
  if (event === "subscription_payment_success") return "active";
  return mapLemonStatus(lsStatus);
}

async function resolveAccountId(payload: WebhookPayload): Promise<string | null> {
  const customId = payload.meta?.custom_data?.account_id;
  if (customId) return customId;

  const service = getServiceClient();
  const subId = subscriptionIdFrom(payload);
  if (subId) {
    const { data } = await service
      .from("accounts")
      .select("id")
      .eq("ls_subscription_id", subId)
      .maybeSingle();
    if (data) return data.id;
  }

  const customerId = payload.data?.attributes?.customer_id;
  if (customerId != null) {
    const { data } = await service
      .from("accounts")
      .select("id")
      .eq("ls_customer_id", String(customerId))
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Billing isn't configured.", { status: 500 });
  }

  const rawBody = await request.text();
  const header = request.headers.get("X-Signature") ?? request.headers.get("x-signature");
  if (!verifySignature(rawBody, header, secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = payload.meta?.event_name;
  if (!event || !HANDLED_EVENTS.has(event)) {
    return new Response("OK", { status: 200 });
  }

  const accountId = await resolveAccountId(payload);
  if (!accountId) {
    console.warn("Lemon Squeezy webhook: no account for", event, payload.data?.id);
    return new Response("OK", { status: 200 });
  }

  const attrs = payload.data?.attributes;
  const patch: Partial<AccountRow> = {
    ls_status: statusForEvent(event, attrs?.status),
  };

  const customerId = attrs?.customer_id;
  if (customerId != null) patch.ls_customer_id = String(customerId);

  const subId = subscriptionIdFrom(payload);
  if (subId) patch.ls_subscription_id = subId;

  if (attrs?.renews_at) patch.ls_renews_at = attrs.renews_at;

  const { error } = await getServiceClient().from("accounts").update(patch).eq("id", accountId);
  if (error) {
    console.error("Lemon Squeezy webhook: account update failed", error);
    return new Response("Update failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
