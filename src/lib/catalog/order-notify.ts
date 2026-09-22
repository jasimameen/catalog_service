import type { OrderFulfillment } from "@/lib/supabase/types";
import type { NotifySoundSettings } from "./template-settings";
import { fulfillmentLabel } from "./checkout-form";

export type OrderNotifyKind = "catalog" | OrderFulfillment;

export function notifyKind(fulfillment: OrderFulfillment | null | undefined): OrderNotifyKind {
  return fulfillment ?? "catalog";
}

export function notifyToastTitle(kind: OrderNotifyKind): string {
  if (kind === "dine_in") return "New dine-in";
  if (kind === "pickup") return "New pickup";
  if (kind === "delivery") return "New delivery";
  return "New order";
}

export function notifyBrowserTitle(kind: OrderNotifyKind): string {
  return notifyToastTitle(kind);
}

export type NotifyCueKind = "order" | "reservation" | "service";

export function shouldPlayNotify(settings: NotifySoundSettings, kind: OrderNotifyKind): boolean {
  if (!settings.enabled) return false;
  return settings[kind] !== false;
}

function beep(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  start: number,
  dur: number,
  gainValue = 0.1,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

/** Three short cues: tickets / bookings / help. Pickup and delivery share the order cue. */
export function playNotifyCue(kind: NotifyCueKind): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    if (kind === "reservation") {
      beep(ctx, 494, "triangle", now, 0.22);
      return;
    }
    if (kind === "service") {
      beep(ctx, 700, "sine", now, 0.1);
      beep(ctx, 560, "sine", now + 0.13, 0.14);
      return;
    }
    beep(ctx, 784, "sine", now, 0.2);
  } catch {
    // autoplay restrictions
  }
}

export function playOrderTone(_kind?: OrderNotifyKind): void {
  playNotifyCue("order");
}

export function guestLabel(order: { shop_name?: string | null; phone?: string | null }): string {
  return order.shop_name || order.phone || "Guest";
}

export function notifyBody(
  order: { reference: string; shop_name?: string | null; phone?: string | null; fulfillment?: OrderFulfillment | null },
): string {
  const extra = order.fulfillment ? ` · ${fulfillmentLabel(order.fulfillment)}` : "";
  return `${order.reference} · ${guestLabel(order)}${extra}`;
}
