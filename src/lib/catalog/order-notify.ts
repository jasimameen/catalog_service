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

function toneFor(kind: OrderNotifyKind): { freq: number; type: OscillatorType; dur: number } {
  if (kind === "dine_in") return { freq: 620, type: "triangle", dur: 0.22 };
  if (kind === "pickup") return { freq: 740, type: "sine", dur: 0.18 };
  if (kind === "delivery") return { freq: 520, type: "square", dur: 0.16 };
  return { freq: 880, type: "sine", dur: 0.2 };
}

export function shouldPlayNotify(settings: NotifySoundSettings, kind: OrderNotifyKind): boolean {
  if (!settings.enabled) return false;
  return settings[kind] !== false;
}

export function playOrderTone(kind: OrderNotifyKind): void {
  try {
    const tone = toneFor(kind);
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + tone.dur);
  } catch {
    // autoplay restrictions
  }
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
