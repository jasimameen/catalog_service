"use client";

import { useActionState, useMemo, useState } from "react";
import type { CheckoutFields, CheckoutFormField, OrderFulfillment } from "@/lib/supabase/types";
import {
  CHECKOUT_FIELD_KEYS,
  CHECKOUT_FIELD_LABELS,
  DEFAULT_CHECKOUT_FIELDS,
} from "@/lib/catalog/checkout-fields";
import {
  FORM_FIELD_TYPES,
  FULFILLMENTS,
  RESTAURANT_PRESET_MODES,
  newFormFieldId,
  restaurantPresetFields,
} from "@/lib/catalog/checkout-form";
import { updateCatalogOrdering, type OrderingState } from "@/app/admin/[catalogId]/actions";
import type { CatalogTemplate } from "@/lib/supabase/types";
import type { TemplateSettings } from "@/lib/catalog/template-settings";
import {
  catalogOffersFloorSettings,
  isRestaurantCatalog,
  parseTemplateSettings,
} from "@/lib/catalog/template-settings";
import { RestaurantSettingsFields } from "./RestaurantSettingsFields";
import {
  dashBtnPrimary,
  dashCard,
  dashHint,
  dashInput,
  dashKicker,
  dashLabel,
  dashSection,
  dashTextarea,
} from "@/components/admin/dashboard/styles";
import { PrintTicketFrame } from "./PrintTicketFrame";
import {
  DEFAULT_PRINT_TICKET_HTML,
  PRINT_TICKET_PLACEHOLDERS,
  PRINT_TICKET_TEMPLATES,
  matchPrintTemplateId,
  printTicketTemplateById,
  renderPrintTicketHtml,
  samplePrintOrder,
} from "@/lib/catalog/print-ticket";

const FIELD_MODES = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "hidden", label: "Hidden" },
] as const;

const FIELD_UI_LABEL: Record<(typeof CHECKOUT_FIELD_KEYS)[number], string> = {
  shopName: "Shop name",
  phone: "Phone",
  address: "Delivery address",
  maps: "Maps link",
  notes: "Notes",
};

export function OrderingCard({
  catalogId,
  fulfillmentModes,
  checkoutFields,
  checkoutForm,
  acceptOrders,
  ordersPausedMessage,
  storefrontAlert,
  showStorefrontAlert,
  template,
  templateSettings,
  orderEmail,
  catalogAddress,
  catalogName,
  currency,
  embedded = false,
}: {
  catalogId: string;
  fulfillmentModes: OrderFulfillment[];
  checkoutFields: CheckoutFields;
  checkoutForm: CheckoutFormField[];
  acceptOrders: boolean;
  ordersPausedMessage: string;
  storefrontAlert: string;
  showStorefrontAlert: boolean;
  template: CatalogTemplate;
  templateSettings: TemplateSettings;
  orderEmail: string;
  catalogAddress?: string;
  catalogName?: string;
  currency?: string;
  embedded?: boolean;
}) {
  const builtIn = checkoutFields ?? DEFAULT_CHECKOUT_FIELDS;
  const [modes, setModes] = useState<OrderFulfillment[]>(fulfillmentModes);
  const [fields, setFields] = useState<CheckoutFormField[]>(checkoutForm);
  const [taking, setTaking] = useState(acceptOrders);
  const [alertOn, setAlertOn] = useState(showStorefrontAlert);
  const [tplSettings, setTplSettings] = useState(() => parseTemplateSettings(templateSettings));
  const restaurantUi = isRestaurantCatalog(template, modes);
  const shopName = catalogName?.trim() || "Catalog";
  const money = currency?.trim() || "AED";
  const selectedTemplate = matchPrintTemplateId(tplSettings.printTicketHtml);
  const previewHtml = useMemo(
    () =>
      renderPrintTicketHtml({
        ...samplePrintOrder({ shop: shopName, currency: money }),
        template: tplSettings.printTicketHtml,
      }),
    [tplSettings.printTicketHtml, shopName, money],
  );
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
    <section id={embedded ? undefined : "ordering"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Ordering</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Form fields and notify. Pause is at the top of this page.
          </p>
        </div>
      )}

      <div>
        <form action={formAction} className="flex flex-col">
          <input type="hidden" name="fulfillment_modes" value={JSON.stringify(modes)} />
          <input type="hidden" name="checkout_form" value={JSON.stringify(fields)} />
          <input type="hidden" name="template_settings" value={JSON.stringify(tplSettings)} />

          <div className="flex flex-col gap-[22px] px-4 pb-2">
            <div className="flex flex-col gap-2.5">
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] text-[var(--cat-ink)]">
                <input
                  type="checkbox"
                  name="acceptOrders"
                  value="1"
                  checked={taking}
                  onChange={(e) => setTaking(e.target.checked)}
                  className="h-[17px] w-[17px] accent-[#0b5fce]"
                />
                Take orders
              </label>
              <p className={`m-0 -mt-1 ${dashHint}`}>
                Off hides cart and add-to-cart. Browsing and search still work.
              </p>
              {!taking ? (
                <p className="m-0 rounded-[11px] border border-[#f3e4c4] bg-[#fff8e8] px-3 py-2 text-[13px] text-[#7a5a12]">
                  Guests can browse, but they cannot place an order until you turn this back on.
                </p>
              ) : null}
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Message when orders are paused</span>
                <textarea
                  name="ordersPausedMessage"
                  defaultValue={ordersPausedMessage}
                  rows={2}
                  maxLength={280}
                  placeholder="We are not taking orders right now."
                  className={dashTextarea}
                />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] text-[var(--cat-ink)]">
                <input
                  type="checkbox"
                  name="showStorefrontAlert"
                  value="1"
                  checked={alertOn}
                  onChange={(e) => setAlertOn(e.target.checked)}
                  className="h-[17px] w-[17px] accent-[#0b5fce]"
                />
                Show storefront alert
              </label>
              <p className={`m-0 -mt-1 ${dashHint}`}>
                A short banner at the top, even while taking orders.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Alert text</span>
                <input
                  name="storefrontAlert"
                  defaultValue={storefrontAlert}
                  maxLength={280}
                  placeholder="Kitchen is running 20 minutes behind tonight."
                  className={dashInput}
                />
              </label>
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>Who gets order emails</p>
              <p className={`m-0 ${dashHint}`}>
                This catalog only. Account Settings is the fallback if To is empty. Team invites
                are not built yet — everyone on the account can open orders here.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Email orders to</span>
                <input
                  name="order_email"
                  type="email"
                  defaultValue={orderEmail}
                  placeholder="kitchen@teaday.com"
                  className={dashInput}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Also send to</span>
                <input
                  value={tplSettings.notify.emailCc}
                  onChange={(e) =>
                    setTplSettings((prev) => ({
                      ...prev,
                      notify: { ...prev.notify, emailCc: e.target.value },
                    }))
                  }
                  placeholder="owner@…, floor@…"
                  className={dashInput}
                />
                <span className={dashHint}>Comma-separated extra addresses for this catalog.</span>
              </label>
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>Print ticket</p>
              <p className={`m-0 ${dashHint}`}>
                Pick a layout, then edit the HTML if you want. Preview uses a sample order.
                Print from each order still uses this template. Placeholders:{" "}
                {PRINT_TICKET_PLACEHOLDERS.join(" ")}
              </p>
              <div className="flex flex-wrap gap-2">
                {PRINT_TICKET_TEMPLATES.map((tpl) => {
                  const on = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        const next = printTicketTemplateById(tpl.id);
                        if (!next) return;
                        setTplSettings((prev) => ({ ...prev, printTicketHtml: next.html }));
                      }}
                      className={`min-h-11 rounded-full border px-4 text-[13px] font-medium active:scale-[0.98] motion-reduce:active:scale-100 ${
                        on
                          ? "border-[#101720] bg-[#101720] text-white"
                          : "border-[#e2e7ee] bg-white text-[#46505e]"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>
              {selectedTemplate ? (
                <p className={`m-0 ${dashHint}`}>
                  {PRINT_TICKET_TEMPLATES.find((t) => t.id === selectedTemplate)?.hint}
                </p>
              ) : (
                <p className={`m-0 ${dashHint}`}>Custom HTML — preview updates as you type.</p>
              )}
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Ticket HTML</span>
                <textarea
                  value={tplSettings.printTicketHtml}
                  onChange={(e) =>
                    setTplSettings((prev) => ({ ...prev, printTicketHtml: e.target.value }))
                  }
                  rows={10}
                  spellCheck={false}
                  placeholder={DEFAULT_PRINT_TICKET_HTML}
                  className={`${dashTextarea} min-h-[12rem] font-mono text-[12px]`}
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className={dashLabel}>Live preview</span>
                <PrintTicketFrame
                  html={previewHtml}
                  title="Print ticket preview"
                  className="h-[320px] w-full rounded-[11px] border border-[#e2e7ee] bg-white"
                />
              </div>
            </div>

            <div className={dashSection}>
              <div className="flex flex-wrap items-center gap-3">
                <p className={`m-0 min-w-0 flex-1 ${dashKicker}`}>Fulfillment</p>
                <button
                  type="button"
                  onClick={applyRestaurantPreset}
                  className="min-h-10 rounded-full border border-[#e2e7ee] bg-[#fbfbfd] px-3.5 text-[13px] hover:border-[#0b5fce] hover:text-[#0b5fce]"
                >
                  Restaurant preset
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {FULFILLMENTS.map((mode) => {
                  const on = modes.includes(mode.value);
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => toggleMode(mode.value)}
                      className={`min-h-11 rounded-full border px-4 text-[13px] font-medium ${
                        on
                          ? "border-[#101720] bg-[#101720] text-white"
                          : "border-[#e2e7ee] bg-white text-[#46505e]"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              {modes.length === 0 ? (
                <p className={`m-0 ${dashHint}`}>
                  None selected — guests will not be asked for dine-in, pickup, or delivery.
                </p>
              ) : null}
              {restaurantUi ? (
                <div className="mt-4">
                  <RestaurantSettingsFields
                    settings={tplSettings}
                    modes={modes}
                    onChange={setTplSettings}
                    catalogAddress={catalogAddress}
                    canEnableFloor={catalogOffersFloorSettings(template, tplSettings)}
                  />
                </div>
              ) : null}
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>{fields.length > 0 ? "Extra questions" : "Guest checkout fields"}</p>
              {fields.length > 0 ? (
                <p className="m-0 text-[13px] leading-snug text-[#5a6472]">
                  These are the questions guests answer at checkout. They replace the simple
                  name / phone / address switches.
                </p>
              ) : (
                <p className="m-0 text-[13px] leading-snug text-[#5a6472]">
                  Built-in guest fields. Required must be filled. Hidden is not shown. Add extra
                  questions only if you need more than these five — that custom form then replaces
                  this list.
                </p>
              )}
              {fields.length > 0
                ? CHECKOUT_FIELD_KEYS.map((key) => (
                    <input key={key} type="hidden" name={`cf_${key}`} value={builtIn[key]} />
                  ))
                : (
                <div className="overflow-hidden rounded-xl border border-[#e2e7ee]">
                  {CHECKOUT_FIELD_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex flex-col gap-2 border-b border-[#f1f4f8] px-3.5 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <label htmlFor={`cf_${key}`} className="min-w-0 text-[14px] text-[var(--cat-ink)]">
                        {FIELD_UI_LABEL[key]}
                        <span className="sr-only"> ({CHECKOUT_FIELD_LABELS[key]})</span>
                      </label>
                      <div className="flex gap-1 self-start rounded-[10px] border border-[#e2e7ee] bg-[#fbfbfd] p-0.5 sm:self-auto">
                        {FIELD_MODES.map((mode) => (
                          <label key={mode.value} className="cursor-pointer">
                            <input
                              type="radio"
                              id={mode.value === builtIn[key] ? `cf_${key}` : undefined}
                              name={`cf_${key}`}
                              value={mode.value}
                              defaultChecked={builtIn[key] === mode.value}
                              className="peer sr-only"
                            />
                            <span className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-[12px] text-[#5a6472] peer-checked:bg-[var(--cat-accent)] peer-checked:text-white">
                              {mode.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={dashLabel}>Phone prefix</span>
                  <input
                    id="phonePrefix"
                    name="phonePrefix"
                    defaultValue={builtIn.phonePrefix}
                    placeholder="+974"
                    maxLength={16}
                    className={dashInput}
                  />
                  <span className={dashHint}>Shown on the phone field. Added if they skip it.</span>
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={dashLabel}>Order reference prefix</span>
                  <input
                    id="orderPrefix"
                    name="orderPrefix"
                    defaultValue={builtIn.orderPrefix}
                    placeholder="KLE"
                    maxLength={16}
                    className={dashInput}
                  />
                  <span className={dashHint}>Becomes KLE-1842 instead of the slug letters.</span>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="m-0 min-w-0 flex-1 text-[13px] font-medium text-[#46505e]">
                  {fields.length > 0 ? "Questions guests see" : "Need more than these five?"}
                </p>
                {fields.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFields([])}
                    className="min-h-10 rounded-[10px] border border-[#e2e7ee] bg-white px-3.5 text-[13px] hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)]"
                  >
                    Use simple guest fields
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setFields((prev) => [
                      ...prev,
                      { id: newFormFieldId(), label: "New field", type: "text", required: false },
                    ])
                  }
                  className="min-h-10 rounded-[10px] border border-dashed border-[#c3ccd9] bg-white px-3.5 text-[13px] hover:border-[#0b5fce] hover:text-[#0b5fce]"
                >
                  Add question
                </button>
              </div>
              {fields.length === 0 ? (
                <p className={`m-0 ${dashHint}`}>
                  Adding a question switches to a custom form and hides the switches above.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#e2e7ee] bg-[#fbfbfd] p-2.5"
                    >
                      <input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className={`${dashInput} flex-1 basis-[160px] bg-white text-[14px]`}
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(index, { type: e.target.value as CheckoutFormField["type"] })
                        }
                        className="min-h-11 min-w-0 flex-[0_1_130px] rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px]"
                      >
                        {FORM_FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px]">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="h-4 w-4 accent-[#0b5fce]"
                        />
                        Required
                      </label>
                      <label className="inline-flex min-h-11 min-w-0 flex-[0_1_190px] items-center gap-2">
                        <span className="shrink-0 text-xs text-[#5a6472]">Show when</span>
                        <select
                          value={field.show_when?.[0] ?? ""}
                          onChange={(e) =>
                            updateField(index, {
                              show_when: e.target.value
                                ? [e.target.value as OrderFulfillment]
                                : undefined,
                            })
                          }
                          className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[13px]"
                        >
                          <option value="">Always</option>
                          {FULFILLMENTS.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                              {mode.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveField(index, -1)}
                          className="h-11 w-11 rounded-[10px] border border-[#e2e7ee] bg-white"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(index, 1)}
                          className="h-11 w-11 rounded-[10px] border border-[#e2e7ee] bg-white"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                          className="h-11 w-11 rounded-[10px] border border-[#e2e7ee] bg-white text-[#b42318]"
                          aria-label="Remove field"
                        >
                          ×
                        </button>
                      </div>
                      {field.type === "select" ? (
                        <input
                          value={(field.options ?? []).join(", ")}
                          onChange={(e) =>
                            updateField(index, {
                              options: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Choice A, Choice B"
                          className={`${dashInput} flex-[1_1_100%] bg-white text-[14px]`}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 z-[1] mt-4 flex flex-wrap items-center gap-3 border-t border-[#edf0f4] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="submit" disabled={pending} className={dashBtnPrimary}>
              {pending ? "Saving…" : "Save ordering"}
            </button>
            {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
            {state?.saved ? <p className="m-0 text-[13px] text-[#1e9e4a]">Saved.</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
