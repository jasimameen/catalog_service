"use client";

import { useActionState, useState } from "react";
import type { CheckoutFormField, OrderFulfillment } from "@/lib/supabase/types";
import {
  FORM_FIELD_TYPES,
  FULFILLMENTS,
  RESTAURANT_PRESET_MODES,
  newFormFieldId,
  restaurantPresetFields,
} from "@/lib/catalog/checkout-form";
import { updateCatalogOrdering, type OrderingState } from "@/app/admin/[catalogId]/actions";

export function OrderingCard({
  catalogId,
  fulfillmentModes,
  checkoutForm,
  acceptOrders,
  ordersPausedMessage,
  storefrontAlert,
  showStorefrontAlert,
}: {
  catalogId: string;
  fulfillmentModes: OrderFulfillment[];
  checkoutForm: CheckoutFormField[];
  acceptOrders: boolean;
  ordersPausedMessage: string;
  storefrontAlert: string;
  showStorefrontAlert: boolean;
}) {
  const [modes, setModes] = useState<OrderFulfillment[]>(fulfillmentModes);
  const [fields, setFields] = useState<CheckoutFormField[]>(checkoutForm);
  const [state, formAction, pending] = useActionState<OrderingState, FormData>(
    updateCatalogOrdering.bind(null, catalogId),
    null,
  );

  function toggleMode(mode: OrderFulfillment) {
    setModes((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]));
  }

  function applyRestaurantPreset() {
    setModes([...RESTAURANT_PRESET_MODES]);
    setFields(restaurantPresetFields());
  }

  function updateField(index: number, patch: Partial<CheckoutFormField>) {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function moveField(index: number, dir: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[swap]!;
      next[swap] = tmp;
      return next;
    });
  }

  return (
    <div id="ordering" className="rounded-2xl border border-[var(--cat-border)] p-5">
      <h3 className="m-0 text-[15px] font-semibold text-[var(--cat-ink)]">Ordering</h3>
      <p className="m-0 mt-1 text-[13px] text-[var(--cat-muted)]">
        Restaurant order types and the fields guests fill in. Trade catalogs can leave this empty.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-5">
        <input type="hidden" name="fulfillment_modes" value={JSON.stringify(modes)} />
        <input type="hidden" name="checkout_form" value={JSON.stringify(fields)} />

        <label className="flex items-start gap-2.5 rounded-[12px] border border-[#e8e8ed] px-3 py-2.5 text-[13px] text-[var(--cat-ink)]">
          <input type="checkbox" name="acceptOrders" value="1" defaultChecked={acceptOrders} className="mt-0.5" />
          <span>
            Take orders
            <span className="mt-0.5 block text-[11px] text-[var(--cat-muted)]">
              Off hides cart and add-to-cart. Browsing and search still work.
            </span>
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-medium text-[var(--cat-ink)]">
          Message when orders are paused
          <textarea
            name="ordersPausedMessage"
            defaultValue={ordersPausedMessage}
            rows={2}
            maxLength={280}
            placeholder="We are not taking orders right now."
            className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] font-normal"
          />
        </label>
        <label className="flex items-start gap-2.5 rounded-[12px] border border-[#e8e8ed] px-3 py-2.5 text-[13px] text-[var(--cat-ink)]">
          <input
            type="checkbox"
            name="showStorefrontAlert"
            value="1"
            defaultChecked={showStorefrontAlert}
            className="mt-0.5"
          />
          <span>
            Show storefront alert
            <span className="mt-0.5 block text-[11px] text-[var(--cat-muted)]">
              A short banner at the top, even while taking orders.
            </span>
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-medium text-[var(--cat-ink)]">
          Alert text
          <textarea
            name="storefrontAlert"
            defaultValue={storefrontAlert}
            rows={2}
            maxLength={280}
            placeholder="Kitchen is running 20 minutes behind tonight."
            className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] font-normal"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Fulfillment
          </p>
          <button
            type="button"
            onClick={applyRestaurantPreset}
            className="min-h-11 rounded-[10px] border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[var(--cat-ink)]"
          >
            Restaurant preset
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FULFILLMENTS.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => toggleMode(mode.value)}
              className={`min-h-11 rounded-full border px-4 text-[13px] font-medium ${
                modes.includes(mode.value)
                  ? "border-[var(--cat-accent)] bg-[var(--cat-accent)] text-white"
                  : "border-[#d2d2d7] bg-white text-[var(--cat-ink)]"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
              Checkout fields
            </p>
            <button
              type="button"
              onClick={() =>
                setFields((prev) => [
                  ...prev,
                  { id: newFormFieldId(), label: "New field", type: "text", required: false },
                ])
              }
              className="min-h-11 text-[13px] font-medium text-[var(--cat-accent)]"
            >
              Add field
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="m-0 text-xs text-[#86868b]">
              Empty uses the Look order-form settings (shop name, phone, address).
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-[12px] border border-[#e8e8ed] p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
                    <input
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="min-h-11 rounded-[10px] border border-[#d2d2d7] px-3 text-[13px] outline-none focus:border-[var(--cat-accent)]"
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, { type: e.target.value as CheckoutFormField["type"] })
                      }
                      className="min-h-11 rounded-[10px] border border-[#d2d2d7] bg-white px-3 text-[13px]"
                    >
                      {FORM_FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveField(index, -1)} className="min-h-11 min-w-11" aria-label="Move up">
                        ↑
                      </button>
                      <button type="button" onClick={() => moveField(index, 1)} className="min-h-11 min-w-11" aria-label="Move down">
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                        className="min-h-11 min-w-11 text-[#b2432b]"
                        aria-label="Remove field"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--cat-muted)]">
                    <label className="flex min-h-11 items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    <label className="flex min-h-11 items-center gap-1.5">
                      Show when
                      <select
                        value={field.show_when?.[0] ?? ""}
                        onChange={(e) =>
                          updateField(index, {
                            show_when: e.target.value
                              ? [e.target.value as OrderFulfillment]
                              : undefined,
                          })
                        }
                        className="rounded-[8px] border border-[#d2d2d7] bg-white px-2 py-1"
                      >
                        <option value="">Always</option>
                        {FULFILLMENTS.map((mode) => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {field.type === "select" ? (
                    <input
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) =>
                        updateField(index, {
                          options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Choice A, Choice B"
                      className="mt-2 min-h-11 w-full rounded-[10px] border border-[#d2d2d7] px-3 text-[13px] outline-none"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {state?.error ? <p className="m-0 text-xs text-[#b2432b]">{state.error}</p> : null}
        {state?.saved ? <p className="m-0 text-xs text-[#1e9e4a]">Saved.</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 self-start rounded-[10px] bg-[var(--cat-ink)] px-4 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save ordering"}
        </button>
      </form>
    </div>
  );
}
