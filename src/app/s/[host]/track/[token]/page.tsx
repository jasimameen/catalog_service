import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { getServiceClient } from "@/lib/supabase/service";
import { resolveCatalogByHost } from "@/lib/catalog/resolve";
import { formatOrderDateTime, parseOrderStatuses, statusLabel } from "@/lib/catalog/order-statuses";
import { darken } from "@/lib/catalog/color";
import { formatMoney } from "@/lib/catalog/currency";
import { StatusTimeline } from "@/components/orders/StatusTimeline";
import type { OrderItemRow, OrderRow, OrderStatusEventRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function decodeHost(hostParam: string): string {
  try {
    return decodeURIComponent(hostParam);
  } catch {
    return hostParam;
  }
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
  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10" style={style}>
      <div className="mb-6 flex items-center gap-3">
        {catalog.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- merchant-uploaded logo URL
          <img src={catalog.logo} alt="" className="h-12 w-12 rounded-xl object-contain" />
        ) : null}
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[#86868b]">Order tracking</p>
          <h1 className="m-0 text-xl font-semibold text-[var(--cat-ink)]">{catalog.name}</h1>
        </div>
      </div>
      <section className="rounded-2xl border border-[var(--cat-border)] bg-white p-5">
        <p className="m-0 text-[13px] text-[#86868b]">Reference</p>
        <p className="m-0 text-lg font-semibold text-[var(--cat-ink)]">{order.reference}</p>
        <p className="m-0 mt-3 text-[13px] text-[#86868b]">Status</p>
        <p className="m-0 text-[15px] font-semibold text-[var(--cat-ink)]">
          {statusLabel(statuses, order.status)}
        </p>
        <p suppressHydrationWarning className="m-0 mt-3 text-[13px] text-[#86868b]">
          Placed {formatOrderDateTime(order.created_at)}
        </p>
        <p className="m-0 mt-4 text-[13px] font-semibold text-[var(--cat-ink)]">Items</p>
        <ul className="mt-1 list-none p-0">
          {items.map((line) => (
            <li key={line.id} className="text-[13px] text-[var(--cat-ink)]">
              {line.qty}× {line.name}
            </li>
          ))}
        </ul>
        <p className="m-0 mt-3 text-[13px] font-semibold text-[var(--cat-ink)]">
          Total {formatMoney(Number(order.subtotal), catalog.currency)}
        </p>
      </section>
      <section className="mt-4 rounded-2xl border border-[var(--cat-border)] bg-white p-5">
        <h2 className="m-0 mb-3 text-[15px] font-semibold text-[var(--cat-ink)]">History</h2>
        <StatusTimeline events={events} statuses={statuses} />
      </section>
    </main>
  );
}
