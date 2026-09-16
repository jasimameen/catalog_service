import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { getServiceClient } from "@/lib/supabase/service";
import { resolveCatalogByHost } from "@/lib/catalog/resolve";
import {
  formatOrderDateTime,
  parseOrderStatuses,
  statusById,
  statusIconKind,
  statusLabel,
} from "@/lib/catalog/order-statuses";
import { darken } from "@/lib/catalog/color";
import { formatMoney } from "@/lib/catalog/currency";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import { StatusIcon } from "@/components/orders/StatusIcon";
import { StatusTimeline } from "@/components/orders/StatusTimeline";
import type { OrderItemRow, OrderRow, OrderStatusEventRow, SelectedOption } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order status",
  robots: { index: false, follow: false },
};

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const FALLBACK_STATUS = "#5b8def";

const COLOR_BY_ID: Record<string, string> = {
  new: "#5b8def",
  confirmed: "#0b5fce",
  scheduled: "#0b5fce",
  preparing: "#e3a008",
  packed: "#e3a008",
  in_progress: "#e3a008",
  ready: "#0f9d58",
  collected: "#0f9d58",
  complete: "#0f9d58",
  out_for_delivery: "#7c3aed",
  shipped: "#7c3aed",
  done: "#86868b",
  on_hold: "#c27c0e",
  cancelled: "#b42318",
  refunded: "#6941c6",
};

function decodeHost(hostParam: string): string {
  try {
    return decodeURIComponent(hostParam);
  } catch {
    return hostParam;
  }
}

function statusColor(id: string, hex: string | undefined): string {
  if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return COLOR_BY_ID[id] ?? FALLBACK_STATUS;
}

function statusTint(hex: string): string {
  return `${hex}1f`;
}

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ host: string; token: string }>;
}) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) notFound();

  const { host: hostParam, token } = await params;
  const host = decodeHost(hostParam);
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length < 8) notFound();

  const catalog = await resolveCatalogByHost(host);
  if (!catalog) notFound();

  const supabase = getServiceClient();
  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("catalog_id", catalog.id)
    .eq("track_token", cleanToken)
    .maybeSingle();
  const order = orderData as OrderRow | null;
  if (!order) notFound();

  const [{ data: lineData }, { data: eventData }, { data: catalogRow }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id),
    supabase.from("order_status_events").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
    supabase.from("catalogs").select("order_statuses, logo, name").eq("id", catalog.id).maybeSingle(),
  ]);

  const items = (lineData ?? []) as OrderItemRow[];
  const events = (eventData ?? []) as OrderStatusEventRow[];
  const statuses = parseOrderStatuses((catalogRow as { order_statuses?: unknown } | null)?.order_statuses);
  const current = statusById(statuses, order.status);
  const currentLabel = statusLabel(statuses, order.status);
  const currentKind = statusIconKind(order.status, currentLabel);
  const currentHex = statusColor(order.status, current?.color);
  const lastEvent = events[events.length - 1];
  const updatedAt = lastEvent?.created_at ?? order.created_at;
  const timeline =
    events.length > 0
      ? events
      : [
          {
            id: `${order.id}-placed`,
            order_id: order.id,
            from_status: null,
            to_status: order.status,
            actor: "customer",
            created_at: order.created_at,
          } satisfies OrderStatusEventRow,
        ];
  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;
  const pathLabel = `${host}/track/${cleanToken}`;

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4"
      style={{
        ...style,
        paddingTop: "max(1.25rem, calc(env(safe-area-inset-top) + 0.75rem))",
        paddingBottom: "max(3.5rem, calc(env(safe-area-inset-bottom) + 1.5rem))",
      }}
    >
      <p
        className={`${plexMono.className} px-0.5 text-[12px] leading-snug text-[#7b8494]`}
        title={pathLabel}
      >
        <span className="block truncate">{pathLabel}</span>
      </p>

      <header className="flex items-center gap-3 rounded-2xl border border-[#e2e7ee] bg-white p-4">
        {catalog.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- merchant-uploaded logo URL
          <img
            src={catalog.logo}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain ring-1 ring-[#e2e7ee]"
          />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#101720] text-[18px] font-semibold text-white">
            {catalog.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a93a2]">
            Order status
          </p>
          <p className="m-0 mt-0.5 truncate text-[16px] font-semibold tracking-[-0.01em] text-[#101720]">
            {catalog.name}
          </p>
        </div>
      </header>

      <section className="flex flex-col items-center rounded-2xl border border-[#e2e7ee] bg-white px-5 py-6.5 text-center">
        <span
          className="grid h-16 w-16 place-items-center rounded-full"
          style={{ background: statusTint(currentHex), color: currentHex }}
        >
          <StatusIcon kind={currentKind} className="h-7.5 w-7.5" />
        </span>
        <p className="m-0 mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a93a2]">
          Current status
        </p>
        <h1 className="m-0 mt-1.5 text-[25px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#101720]">
          {currentLabel}
        </h1>
        <p suppressHydrationWarning className="m-0 mt-1.5 text-[13px] text-[#5a6472]">
          Updated {formatOrderDateTime(updatedAt)}
        </p>
      </section>

      <section className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2e7ee] bg-white px-4.5 py-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a93a2]">
            Reference
          </p>
          <p className={`${plexMono.className} m-0 mt-0.75 truncate text-[16px] font-medium text-[#101720]`}>
            {order.reference}
          </p>
        </div>
        <p
          suppressHydrationWarning
          className="m-0 shrink-0 text-right text-[12px] leading-normal text-[#8a93a2]"
        >
          Placed
          <br />
          {formatOrderDateTime(order.created_at)}
        </p>
      </section>

      <section className="flex flex-col gap-3.5 rounded-2xl border border-[#e2e7ee] bg-white p-4.5">
        <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a93a2]">Items</p>
        {items.length === 0 ? (
          <p className="m-0 text-[14px] text-[#8a93a2]">No items on this order.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((line) => {
              const optionText = formatSelectedOptions(
                Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : [],
              );
              return (
                <li key={line.id} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] leading-snug text-[#101720]">
                      {line.qty}× {line.name}
                    </p>
                    {optionText ? (
                      <p className="m-0 mt-0.5 text-[12px] text-[#8a93a2]">{optionText}</p>
                    ) : null}
                  </div>
                  <p className="m-0 shrink-0 text-[14px] tabular-nums text-[#101720]">
                    {formatMoney(Number(line.line_total || Number(line.price) * line.qty), catalog.currency)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="m-0 flex items-baseline justify-between border-t border-[#edf0f4] pt-3.5">
          <span className="text-[13px] text-[#5a6472]">Total</span>
          <span className="text-[20px] font-semibold tabular-nums tracking-tight text-[#101720]">
            {formatMoney(Number(order.subtotal), catalog.currency)}
          </span>
        </p>
      </section>

      <section className="flex flex-col gap-3.5 rounded-2xl border border-[#e2e7ee] bg-white p-4.5">
        <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a93a2]">
          Updates
        </p>
        <StatusTimeline events={timeline} statuses={statuses} />
      </section>

      <p className="m-0 px-1 pt-1.5 text-center text-[12px] leading-[1.6] text-[#8a93a2]">
        This page updates as {catalog.name} moves your order along. Keep the link to check back.
      </p>
    </main>
  );
}
