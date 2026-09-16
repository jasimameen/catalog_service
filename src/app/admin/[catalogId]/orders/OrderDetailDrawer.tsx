"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { fulfillmentLabel } from "@/lib/catalog/checkout-form";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import {
  formatComboIncludes,
  osmEmbedUrl,
  parseComboSnapshot,
  thumbForSku,
  type ItemThumb,
} from "@/lib/catalog/combos";
import { formatOrderDateTime, statusLabel, type OrderStatusDef } from "@/lib/catalog/order-statuses";
import type {
  CheckoutFormField,
  OrderItemRow,
  OrderRow,
  OrderStatusEventRow,
  SelectedOption,
} from "@/lib/supabase/types";
import { StatusTimeline } from "@/components/orders/StatusTimeline";
import { ensureTrackLink } from "./actions";

const BUILTIN_FIELD_IDS = new Set([
  "shopName",
  "shop_name",
  "name",
  "customer",
  "phone",
  "tel",
  "mobile",
  "address",
  "location",
  "delivery_address",
  "maps",
  "mapsLink",
  "maps_link",
  "notes",
  "note",
  "special_requests",
  "table",
  "table_no",
  "tableNo",
]);

function asFormValues(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) next[key] = value.trim();
  }
  return next;
}

function customerEmail(values: Record<string, string>): string {
  for (const [key, value] of Object.entries(values)) {
    if (/email/i.test(key) && value.includes("@")) return value;
  }
  return "";
}

function statusTint(hex?: string) {
  return hex ? `${hex}1a` : "#fbfbfd";
}

function LinePhoto({ src, name }: { src: string; name: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- catalog URLs are arbitrary
      <img src={src} alt="" className="h-full w-full object-cover" />
    );
  }
  const letter = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span className="flex h-full w-full items-center justify-center bg-[#eef1f5] text-[17px] font-semibold text-[#8a93a2]">
      {letter}
    </span>
  );
}

export function OrderDetailDrawer({
  catalogId,
  order,
  lines,
  events,
  statuses,
  currency,
  showFulfillment,
  thumbs,
  checkoutForm,
  onClose,
  onStatus,
  onCopied,
}: {
  catalogId: string;
  order: OrderRow;
  lines: OrderItemRow[];
  events: OrderStatusEventRow[];
  statuses: OrderStatusDef[];
  currency: string;
  showFulfillment: boolean;
  thumbs: ItemThumb[];
  checkoutForm: CheckoutFormField[];
  onClose: () => void;
  onStatus: (next: string) => void;
  onCopied: (message: string) => void;
}) {
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const values = asFormValues(order.form_values);
  const email = customerEmail(values);
  const labels = new Map(checkoutForm.map((field) => [field.id, field.label]));
  const extras = Object.entries(values).filter(([key]) => !BUILTIN_FIELD_IDS.has(key) && !/email/i.test(key));
  const lat = order.geo_lat;
  const lng = order.geo_lng;
  const hasPin =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);
  const options = statuses.some((row) => row.id === order.status)
    ? statuses
    : [
        ...statuses,
        {
          id: order.status,
          label: statusLabel(statuses, order.status),
          sort: statuses.length,
          is_done: false,
        },
      ];
  const current = statuses.find((row) => row.id === order.status);
  const statusColor = current?.color || "#86868b";

  async function copyLink() {
    setCopying(true);
    const result = await ensureTrackLink(catalogId, order.id);
    setCopying(false);
    if (result.error || !result.url) {
      onCopied(result.error || "Could not copy tracking link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(result.url);
      onCopied("Tracking link copied.");
    } catch {
      onCopied(result.url);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-end bg-black/40 md:items-stretch"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="orders-sheet flex h-[92%] w-full max-h-full max-w-none flex-col overflow-y-auto rounded-t-[18px] bg-white md:h-full md:max-w-[440px] md:rounded-none md:border-l md:border-[#e2e7ee]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-[1] border-b border-[#edf0f4] bg-white px-[18px] py-[15px]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e2e7ee] md:hidden" aria-hidden />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Order</p>
              <h2
                id="order-detail-title"
                className="m-0 mt-[3px] font-mono text-[17px] font-medium tracking-tight text-[var(--cat-ink)]"
              >
                {order.reference}
              </h2>
              <p suppressHydrationWarning className="m-0 mt-0.5 text-[12px] text-[#8a93a2]">
                {formatOrderDateTime(order.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[11px] border border-[#e2e7ee] bg-white text-[16px] leading-none text-[#5a6472]"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-[22px] px-[18px] py-[18px] pb-[max(18px,env(safe-area-inset-bottom))]">
          <section className="flex flex-col gap-2.5">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Status</div>
            <div
              className="flex items-center gap-2 rounded-xl border p-1"
              style={{ borderColor: statusColor, background: statusTint(statusColor) }}
            >
              <span
                className="ml-2 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: statusColor }}
                aria-hidden
              />
              <label className="sr-only" htmlFor={`drawer-status-${order.id}`}>
                Status for {order.reference}
              </label>
              <select
                id={`drawer-status-${order.id}`}
                value={order.status}
                onChange={(event) => onStatus(event.target.value)}
                className="min-h-10 min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-[14px] font-medium text-[var(--cat-ink)]"
              >
                {options.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>
            <StatusTimeline events={events} statuses={statuses} showActor />
          </section>

          <section className="flex flex-col gap-[7px] border-t border-[#edf0f4] pt-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Customer</div>
            <div className="text-[15px] text-[var(--cat-ink)]">{order.shop_name || "Guest"}</div>
            {order.phone ? (
              <a href={`tel:${order.phone}`} className="text-[14px] text-[var(--cat-accent)] hover:text-[var(--cat-accent-dark)]">
                {order.phone}
              </a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} className="text-[14px] text-[var(--cat-accent)] hover:text-[var(--cat-accent-dark)]">
                {email}
              </a>
            ) : null}
            {showFulfillment && (order.fulfillment || order.table_no) ? (
              <div className="text-[13px] text-[#5a6472]">
                {order.fulfillment ? fulfillmentLabel(order.fulfillment) : ""}
                {order.table_no ? `${order.fulfillment ? " · " : ""}Table ${order.table_no}` : ""}
              </div>
            ) : null}
          </section>

          {order.location || order.maps_link || hasPin ? (
            <section className="flex flex-col gap-2 border-t border-[#edf0f4] pt-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Location</div>
              {order.location ? (
                <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--cat-ink)]">
                  {order.location}
                </div>
              ) : null}
              {order.maps_link ? (
                <a
                  href={order.maps_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-[var(--cat-accent)] hover:text-[var(--cat-accent-dark)]"
                >
                  Open saved map link
                </a>
              ) : null}
              {hasPin && lat != null && lng != null ? (
                <>
                  <div className="overflow-hidden rounded-xl border border-[#e2e7ee] bg-[#eef1f5]">
                    <iframe
                      title="Order location"
                      src={osmEmbedUrl(lat, lng)}
                      className="block h-[180px] w-full border-0"
                      loading="lazy"
                    />
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] text-[var(--cat-accent)] hover:text-[var(--cat-accent-dark)]"
                  >
                    Open in OpenStreetMap
                  </a>
                </>
              ) : null}
            </section>
          ) : null}

          {extras.length > 0 ? (
            <section className="flex flex-col gap-2 border-t border-[#edf0f4] pt-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Checkout fields</div>
              {extras.map(([key, value]) => (
                <div key={key} className="flex flex-wrap gap-x-2.5 gap-y-1 text-[14px]">
                  <span className="w-[132px] shrink-0 text-[#8a93a2]">{labels.get(key) || key}</span>
                  <span className="min-w-[140px] flex-1 text-[var(--cat-ink)]">{value}</span>
                </div>
              ))}
            </section>
          ) : null}

          <section className="flex flex-col gap-3.5 border-t border-[#edf0f4] pt-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Items</div>
            {lines.map((line) => {
              const thumb = thumbForSku(line.code, thumbs);
              const optionText = formatSelectedOptions(
                Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : [],
              );
              const combo = parseComboSnapshot(line.combo_json);
              return (
                <div key={line.id} className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#eef1f5]">
                    <LinePhoto src={thumb?.image ?? ""} name={line.name} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <div className="text-[14px] font-medium text-[var(--cat-ink)]">{line.name}</div>
                    {optionText ? <div className="text-[12px] text-[#5a6472]">{optionText}</div> : null}
                    {combo.length > 0 ? (
                      <div className="text-[12px] text-[#5a6472]">Includes {formatComboIncludes(combo)}</div>
                    ) : null}
                    {line.notes ? <div className="text-[12px] text-[#8a93a2]">{line.notes}</div> : null}
                    <div className="text-[12px] text-[#8a93a2]">
                      {line.qty} × {formatMoney(Number(line.price), currency)}
                    </div>
                  </div>
                  <div className="shrink-0 text-[14px] tabular-nums text-[var(--cat-ink)]">
                    {formatMoney(Number(line.line_total), currency)}
                  </div>
                </div>
              );
            })}
            <div className="flex items-baseline justify-between border-t border-[#edf0f4] pt-3">
              <span className="text-[13px] text-[#5a6472]">Total</span>
              <span className="text-[18px] font-semibold tabular-nums text-[var(--cat-ink)]">
                {formatMoney(Number(order.subtotal), currency)}
              </span>
            </div>
          </section>

          {order.notes ? (
            <section className="flex flex-col gap-[7px] border-t border-[#edf0f4] pt-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a93a2]">Notes</div>
              <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--cat-ink)]">
                {order.notes}
              </div>
            </section>
          ) : null}

          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={copying}
            className="min-h-11 w-full cursor-pointer rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] text-[14px] text-[var(--cat-ink)] hover:border-[#c3ccd9] disabled:opacity-50"
          >
            {copying ? "Copying…" : "Copy tracking link"}
          </button>
        </div>
      </aside>
      <style>{`
        @keyframes orders-sheet-in { from { transform: translateX(24px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
        @keyframes orders-sheet-up { from { transform: translateY(20px); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
        .orders-sheet { animation: orders-sheet-up 0.18s ease-out; }
        @media (min-width: 768px) {
          .orders-sheet { animation: orders-sheet-in 0.18s ease-out; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orders-sheet { animation: none; }
        }
      `}</style>
    </div>
  );
}
