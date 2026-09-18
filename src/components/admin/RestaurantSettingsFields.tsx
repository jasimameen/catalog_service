"use client";

import { useState } from "react";
import type { OrderFulfillment } from "@/lib/supabase/types";
import type { TemplateSettings } from "@/lib/catalog/template-settings";
import { FULFILLMENTS } from "@/lib/catalog/checkout-form";
import { parsePastedCoords } from "@/lib/catalog/dine-in-presence";
import { dashHint, dashInput, dashKicker, dashLabel, dashTextarea } from "@/components/admin/dashboard/styles";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3.5 text-[13px] has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#eef4fd]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#0b5fce]" />
      {label}
    </label>
  );
}

export function RestaurantSettingsFields({
  settings,
  modes,
  onChange,
  catalogAddress,
}: {
  settings: TemplateSettings;
  modes: OrderFulfillment[];
  onChange: (next: TemplateSettings) => void;
  catalogAddress?: string;
}) {
  const r = settings.restaurant;
  const n = settings.notify;
  const [paste, setPaste] = useState("");
  const [pasteMsg, setPasteMsg] = useState("");
  function patch(partial: Partial<typeof r>) {
    onChange({ ...settings, restaurant: { ...r, ...partial } });
  }

  function applyPastedCoords() {
    const parsed = parsePastedCoords(paste);
    if (!parsed) {
      setPasteMsg("Use two numbers, like 25.4170, 51.5320");
      return;
    }
    patch({ venueLat: parsed.lat, venueLng: parsed.lng });
    setPasteMsg("Coordinates saved. Guests within the radius can auto-select dine-in.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={dashKicker}>Default mode</p>
        <p className={dashHint}>Used when a guest opens the menu. Only enabled fulfillment types appear.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patch({ defaultMode: "" })}
            className={`min-h-10 rounded-full border px-3.5 text-[13px] ${r.defaultMode ? "border-[#e2e7ee] bg-white" : "border-[#101720] bg-[#101720] text-white"}`}
          >
            First available
          </button>
          {FULFILLMENTS.filter((m) => modes.includes(m.value)).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => patch({ defaultMode: m.value })}
              className={`min-h-10 rounded-full border px-3.5 text-[13px] ${
                r.defaultMode === m.value ? "border-[#101720] bg-[#101720] text-white" : "border-[#e2e7ee] bg-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={dashLabel}>Delivery fee</span>
          <input type="number" min={0} step="0.01" value={r.deliveryFee} onChange={(e) => patch({ deliveryFee: Number(e.target.value) })} className={dashInput} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={dashLabel}>Minimum order</span>
          <input type="number" min={0} step="0.01" value={r.minOrder} onChange={(e) => patch({ minOrder: Number(e.target.value) })} className={dashInput} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={dashLabel}>Service %</span>
          <input type="number" min={0} max={40} step="0.5" value={r.servicePercent} onChange={(e) => patch({ servicePercent: Number(e.target.value) })} className={dashInput} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={dashLabel}>Pickup timing copy</span>
        <input value={r.pickupReadyCopy} onChange={(e) => patch({ pickupReadyCopy: e.target.value })} className={dashInput} />
      </label>

      <div>
        <p className={dashKicker}>Open / closed</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Toggle label="Kitchen / store is open" checked={r.kitchenOpen} onChange={(v) => patch({ kitchenOpen: v })} />
          <Toggle label="Allow scheduling when closed" checked={r.scheduleWhenClosed} onChange={(v) => patch({ scheduleWhenClosed: v })} />
        </div>
        <label className="mt-2 flex flex-col gap-1.5">
          <span className={dashLabel}>Closed banner</span>
          <input value={r.closedBanner} onChange={(e) => patch({ closedBanner: e.target.value })} className={dashInput} />
        </label>
        <label className="mt-2 flex flex-col gap-1.5">
          <span className={dashLabel}>Reopen line</span>
          <input value={r.reopenCopy} onChange={(e) => patch({ reopenCopy: e.target.value })} placeholder="Opens at 11:00" className={dashInput} />
        </label>
      </div>

      <div>
        <p className={dashKicker}>Reserve a table</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Toggle label="Guests can reserve" checked={r.enableReserve} onChange={(v) => patch({ enableReserve: v })} />
        </div>
        <label className="mt-2 flex flex-col gap-1.5">
          <span className={dashLabel}>Hold policy</span>
          <textarea value={r.holdPolicy} onChange={(e) => patch({ holdPolicy: e.target.value })} rows={2} className={dashTextarea} />
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1.5">
            <span className={dashLabel}>Min guests</span>
            <input type="number" min={1} value={r.guestMin} onChange={(e) => patch({ guestMin: Number(e.target.value) })} className={dashInput} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={dashLabel}>Max guests</span>
            <input type="number" min={1} value={r.guestMax} onChange={(e) => patch({ guestMax: Number(e.target.value) })} className={dashInput} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={dashLabel}>Days ahead</span>
            <input type="number" min={1} max={14} value={r.dayCount} onChange={(e) => patch({ dayCount: Number(e.target.value) })} className={dashInput} />
          </label>
        </div>
        <label className="mt-2 flex flex-col gap-1.5">
          <span className={dashLabel}>Time slots (comma separated)</span>
          <input
            value={r.timeSlots.join(", ")}
            onChange={(e) =>
              patch({
                timeSlots: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            className={dashInput}
          />
        </label>
      </div>

      <div>
        <p className={dashKicker}>Dine-in extras</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Toggle label="Table QR / pick table" checked={r.dineInQr} onChange={(v) => patch({ dineInQr: v })} />
          <Toggle label="Dine-in: skip guest details" checked={r.skipDineInDetails} onChange={(v) => patch({ skipDineInDetails: v })} />
          <Toggle
            label="Ask if already at the restaurant"
            checked={r.requireInRestaurantCheck}
            onChange={(v) => patch({ requireInRestaurantCheck: v })}
          />
          <Toggle label="Call waiter" checked={r.callWaiter} onChange={(v) => patch({ callWaiter: v })} />
          <Toggle label="Request bill" checked={r.requestBill} onChange={(v) => patch({ requestBill: v })} />
          <Toggle label="Kitchen rounds" checked={r.kitchenRounds} onChange={(v) => patch({ kitchenRounds: v })} />
        </div>
        <p className={`mt-2 ${dashHint}`}>
          Skip guest details asks only for the table. Pickup and delivery still collect name and phone.
          The in-restaurant check is skipped when a guest opens a table QR.
        </p>
        {modes.includes("dine_in") ? (
          <div className="mt-3 rounded-[12px] border border-[#e2e7ee] bg-[#fbfbfd] p-3">
            <p className={dashKicker}>Restaurant location</p>
            <p className={`mt-1 ${dashHint}`}>
              Optional. Used when a guest taps “Use my location”. Paste coordinates — no paid map lookup.
              {catalogAddress ? ` Address on file: ${catalogAddress}.` : ""} Look map lat/lng is used if these are empty.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Latitude</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.venueLat ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === "") {
                      patch({ venueLat: null });
                      return;
                    }
                    const n = Number(raw);
                    if (Number.isFinite(n)) patch({ venueLat: n });
                  }}
                  placeholder="25.4170"
                  className={dashInput}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Longitude</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.venueLng ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === "") {
                      patch({ venueLng: null });
                      return;
                    }
                    const n = Number(raw);
                    if (Number.isFinite(n)) patch({ venueLng: n });
                  }}
                  placeholder="51.5320"
                  className={dashInput}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Radius (meters)</span>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={r.venueRadiusM}
                  onChange={(e) => patch({ venueRadiusM: Number(e.target.value) })}
                  className={dashInput}
                />
              </label>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className={dashLabel}>Paste lat, lng</span>
                <input
                  value={paste}
                  onChange={(e) => {
                    setPaste(e.target.value);
                    setPasteMsg("");
                  }}
                  placeholder="25.4170, 51.5320"
                  className={dashInput}
                />
              </label>
              <button
                type="button"
                onClick={applyPastedCoords}
                className="h-11 shrink-0 rounded-[11px] border border-[#101720] bg-[#101720] px-3.5 text-[13px] font-semibold text-white"
              >
                Apply coords
              </button>
            </div>
            {pasteMsg ? <p className={`mt-2 ${dashHint}`}>{pasteMsg}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={dashLabel}>Cart CTA</span>
          <input value={r.orderCta} onChange={(e) => patch({ orderCta: e.target.value })} className={dashInput} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={dashLabel}>Dine-in CTA</span>
          <input value={r.kitchenCta} onChange={(e) => patch({ kitchenCta: e.target.value })} className={dashInput} />
        </label>
      </div>

      <div>
        <p className={dashKicker}>Orders inbox</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Toggle label="Take / claimed" checked={r.enableClaim} onChange={(v) => patch({ enableClaim: v })} />
          <Toggle
            label="Notification sounds"
            checked={n.enabled}
            onChange={(v) => onChange({ ...settings, notify: { ...n, enabled: v } })}
          />
        </div>
        {n.enabled ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Toggle label="Catalog orders" checked={n.catalog} onChange={(v) => onChange({ ...settings, notify: { ...n, catalog: v } })} />
            <Toggle label="Dine-in" checked={n.dine_in} onChange={(v) => onChange({ ...settings, notify: { ...n, dine_in: v } })} />
            <Toggle label="Pickup" checked={n.pickup} onChange={(v) => onChange({ ...settings, notify: { ...n, pickup: v } })} />
            <Toggle label="Delivery" checked={n.delivery} onChange={(v) => onChange({ ...settings, notify: { ...n, delivery: v } })} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
