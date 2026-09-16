"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/catalog/cart-context";
import { formatMoney } from "@/lib/catalog/currency";
import {
  FULFILLMENTS,
  fulfillmentLabel,
  mapFormValues,
  missingCustomFieldLabels,
  visibleCheckoutFields,
} from "@/lib/catalog/checkout-form";
import { formatComboIncludes } from "@/lib/catalog/combos";
import { formatSelectedOptions, unitPriceWithOptions } from "@/lib/catalog/item-options";
import { loadGuestAddress, mapsUrlFromCoords, saveGuestAddress } from "@/lib/catalog/guest-address";
import type { CheckoutFields, CheckoutFormField, OrderFulfillment } from "@/lib/supabase/types";
import type { OrderResult } from "@/lib/catalog/order-types";
import { QuantityStepper } from "./QuantityStepper";

type Step = "review" | "delivery";
type Status = "idle" | "submitting" | "error";

export function CartPanel({
  catalogId,
  currency,
  checkoutFields,
  checkoutForm,
  fulfillmentModes,
  open,
  onClose,
  onPlaced,
}: {
  catalogId: string;
  currency: string;
  checkoutFields: CheckoutFields;
  checkoutForm: CheckoutFormField[];
  fulfillmentModes: OrderFulfillment[];
  open: boolean;
  onClose: () => void;
  onPlaced: (result: OrderResult) => void;
}) {
  const { items, lines, itemCount, lineCount, subtotal, incrementLine, decrementLine, clear } = useCart();
  const [step, setStep] = useState<Step>("review");
  const [fulfillment, setFulfillment] = useState<OrderFulfillment | null>(
    fulfillmentModes.length === 1 ? fulfillmentModes[0]! : null,
  );
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const cartItems = lines
    .map((line) => {
      const item = items.find((p) => p.code === line.code);
      return item ? { item, line } : null;
    })
    .filter((entry): entry is { item: (typeof items)[number]; line: (typeof lines)[number] } => entry !== null);

  const visibleFields = useMemo(
    () => visibleCheckoutFields(checkoutForm, fulfillmentModes.length > 0 ? fulfillment : null),
    [checkoutForm, fulfillment, fulfillmentModes.length],
  );

  const missing = useMemo(() => {
    const labels: string[] = [];
    if (fulfillmentModes.length > 0 && !fulfillment) labels.push("order type");
    labels.push(...missingCustomFieldLabels(visibleFields, formValues));
    return labels;
  }, [fulfillment, fulfillmentModes.length, visibleFields, formValues]);
  const canSubmit = missing.length === 0;

  function setField(id: string, value: string) {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  }

  const phoneValue = formValues.phone ?? formValues.tel ?? formValues.mobile ?? "";

  useEffect(() => {
    if (!phoneValue) return;
    const saved = loadGuestAddress(catalogId, phoneValue);
    if (!saved) return;
    setFormValues((prev) => {
      const next = { ...prev };
      if (saved.address) {
        if (!next.address) next.address = saved.address;
        if (!next.location) next.location = saved.address;
      }
      if (saved.maps && !next.maps && !next.mapsLink) next.maps = saved.maps;
      return next;
    });
    if (saved.lat != null) setGeoLat(saved.lat);
    if (saved.lng != null) setGeoLng(saved.lng);
  }, [catalogId, phoneValue]);

  function submitLabel() {
    if (status === "submitting") return "Sending order…";
    if (missing.length === 0) return "Place order";
    if (missing.length === 1) return `Fill ${missing[0]}`;
    if (missing.length === 2) return `Fill ${missing[0]} and ${missing[1]}`;
    return `Fill ${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setErrorMessage("Location is not available in this browser.");
      setStatus("error");
      return;
    }
    setLocating(true);
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const url = mapsUrlFromCoords(lat, lng);
        const pin = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setGeoLat(lat);
        setGeoLng(lng);
        setFormValues((prev) => ({
          ...prev,
          maps: prev.maps || url,
          mapsLink: prev.mapsLink || url,
          address: prev.address || pin,
          location: prev.location || pin,
        }));
        setLocating(false);
      },
      () => {
        setErrorMessage("Could not read your location. Allow location access and try again.");
        setStatus("error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || cartItems.length === 0) return;
    setStatus("submitting");
    setErrorMessage("");
    const mapped = mapFormValues(visibleFields, {
      ...formValues,
      shopName: formValues.shopName ?? formValues.name ?? "",
      phone: phoneValue,
      location: formValues.location ?? formValues.address ?? "",
    });
    try {
      const res = await fetch("/api/catalog/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId,
          shopName: mapped.shopName,
          phone: mapped.phone || phoneValue,
          location: mapped.location || formValues.address || "",
          mapsLink: mapped.mapsLink || formValues.maps || "",
          notes: mapped.notes || formValues.notes || "",
          fulfillment,
          tableNo: mapped.tableNo || formValues.table || "",
          geoLat,
          geoLng,
          formValues,
          items: cartItems.map(({ item, line }) => ({
            code: item.code,
            qty: line.qty,
            options: line.options,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        reference?: string;
        total?: number;
        itemCount?: number;
        lineCount?: number;
        trackUrl?: string;
      } | null;
      if (!res.ok || !data?.reference || typeof data.total !== "number") {
        setErrorMessage(data?.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      const result: OrderResult = {
        reference: data.reference,
        total: data.total,
        itemCount: data.itemCount ?? 0,
        lineCount: data.lineCount ?? 0,
        shopName: mapped.shopName,
        phone: mapped.phone || phoneValue,
        trackUrl: typeof data.trackUrl === "string" ? data.trackUrl : undefined,
      };
      saveGuestAddress(catalogId, mapped.phone || phoneValue, {
        address: mapped.location || formValues.address || "",
        maps: mapped.mapsLink || formValues.maps || "",
        lat: geoLat,
        lng: geoLng,
      });
      clear();
      setFormValues({});
      setFulfillment(fulfillmentModes.length === 1 ? fulfillmentModes[0]! : null);
      setGeoLat(null);
      setGeoLng(null);
      setStep("review");
      setStatus("idle");
      onPlaced(result);
    } catch {
      setErrorMessage("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (!open) return null;

  const detailsTitle = fulfillmentModes.length > 0 ? "Your details" : "Delivery details";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--cat-border)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            {step === "delivery" && (
              <button
                type="button"
                onClick={() => setStep("review")}
                aria-label="Back to order"
                className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-[var(--cat-muted)] hover:bg-slate-100"
              >
                ←
              </button>
            )}
            <h2 className="text-lg font-bold text-[var(--cat-ink)]">
              {step === "review" ? "Your order" : detailsTitle}
            </h2>
            {step === "review" && (
              <span className="text-sm text-[var(--cat-muted)]">
                {itemCount} unit{itemCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg leading-none text-[var(--cat-muted)] hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cartItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--cat-muted)]">
              Your cart is empty. Add some products to get started.
            </p>
          ) : step === "review" ? (
            <ul className="divide-y divide-slate-100">
              {cartItems.map(({ item, line }) => {
                const unit = unitPriceWithOptions(item.price, line.options);
                const extras = formatSelectedOptions(line.options);
                return (
                  <li key={line.key} className="flex items-center gap-3 py-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--cat-photo-bg)]">
                      {item.image ? (
                        // User-pasted https/data URLs are not in next/image remotePatterns.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--cat-ink)]">{item.name}</p>
                      {item.isCombo && item.comboIncludes.length > 0 ? (
                        <p className="text-xs text-[var(--cat-muted)]">
                          Includes {formatComboIncludes(item.comboIncludes)}
                        </p>
                      ) : null}
                      {extras ? <p className="text-xs text-[var(--cat-muted)]">{extras}</p> : null}
                      <p className="text-xs text-[var(--cat-muted)]">
                        {formatMoney(unit, currency)} each
                      </p>
                    </div>
                    <QuantityStepper
                      qty={line.qty}
                      label={item.name}
                      onDecrement={() => decrementLine(line.key)}
                      onIncrement={() => incrementLine(line.key)}
                    />
                    <p className="w-16 shrink-0 text-right text-sm font-semibold text-[var(--cat-ink)]">
                      {(unit * line.qty).toFixed(2)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <form id="delivery-form" onSubmit={handleSubmit} className="space-y-3">
              <p className="text-sm text-[var(--cat-muted)]">
                No payment now — we confirm the order
                {fulfillment ? ` for ${fulfillmentLabel(fulfillment).toLowerCase()}` : ""}.
              </p>
              {fulfillmentModes.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-[var(--cat-muted)]">Order type *</p>
                  <div className="grid grid-cols-3 gap-2">
                    {FULFILLMENTS.filter((mode) => fulfillmentModes.includes(mode.value)).map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setFulfillment(mode.value)}
                        className={`min-h-11 rounded-[9px] border text-sm font-semibold ${
                          fulfillment === mode.value
                            ? "border-[var(--cat-accent)] bg-[var(--cat-accent)] text-white"
                            : "border-[var(--cat-border)] bg-white text-[var(--cat-ink)]"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {visibleFields.map((field) => (
                <CheckoutFieldInput
                  key={field.id}
                  field={field}
                  value={formValues[field.id] ?? ""}
                  phonePrefix={field.type === "tel" ? checkoutFields.phonePrefix : ""}
                  onChange={(value) => setField(field.id, value)}
                  onUseLocation={
                    field.id === "address" || field.id === "location" || field.id === "maps"
                      ? useMyLocation
                      : undefined
                  }
                  locating={locating}
                />
              ))}
              {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
            </form>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="sticky bottom-0 border-t border-[var(--cat-border)] bg-white px-4 py-3.5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-[var(--cat-muted)]">
                {step === "review"
                  ? "Subtotal"
                  : `${itemCount} unit${itemCount === 1 ? "" : "s"} · ${lineCount} line${lineCount === 1 ? "" : "s"}`}
              </span>
              <span className="text-base font-bold text-[var(--cat-ink)]">
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            {step === "review" ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 w-full rounded-[9px] border border-[var(--cat-border)] bg-white text-sm font-semibold text-[var(--cat-ink)]"
                >
                  Add more items
                </button>
                <button
                  type="button"
                  onClick={() => setStep("delivery")}
                  className="min-h-11 w-full rounded-[9px] bg-[var(--cat-accent)] text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Continue to {fulfillmentModes.length > 0 ? "checkout" : "delivery details"}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="delivery-form"
                disabled={!canSubmit || status === "submitting"}
                className="min-h-11 w-full rounded-[9px] bg-[var(--cat-accent)] text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitLabel()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutFieldInput({
  field,
  value,
  phonePrefix,
  onChange,
  onUseLocation,
  locating,
}: {
  field: CheckoutFormField;
  value: string;
  phonePrefix: string;
  onChange: (value: string) => void;
  onUseLocation?: () => void;
  locating: boolean;
}) {
  const requiredMark = field.required ? " *" : " (optional)";
  const inputClass =
    "w-full min-h-11 rounded-[9px] border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none";

  if (field.type === "select") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">
          {field.label}
          {requiredMark}
        </label>
        <select
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Choose…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-[var(--cat-muted)]">
            {field.label}
            {requiredMark}
          </label>
          {onUseLocation ? (
            <button
              type="button"
              onClick={onUseLocation}
              className="text-xs font-semibold text-[var(--cat-accent)]"
            >
              {locating ? "Finding you…" : "Use my location"}
            </button>
          ) : null}
        </div>
        <textarea
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-[9px] border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none"
        />
      </div>
    );
  }

  if (field.type === "tel") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cat-muted)]">
          {field.label}
          {requiredMark}
        </label>
        <div className="flex">
          {phonePrefix ? (
            <span className="inline-flex min-h-11 items-center rounded-l-[9px] border border-r-0 border-[var(--cat-border)] bg-[var(--cat-photo-bg)] px-3 text-sm text-[var(--cat-ink)]">
              {phonePrefix}
            </span>
          ) : null}
          <input
            required={field.required}
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={phonePrefix ? "3300 0000" : "+974 3300 0000"}
            className={`min-h-11 w-full border border-[var(--cat-border)] px-3 py-2 text-sm focus:border-[var(--cat-accent)] focus:outline-none ${
              phonePrefix ? "rounded-r-[9px]" : "rounded-[9px]"
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-[var(--cat-muted)]">
          {field.label}
          {requiredMark}
        </label>
        {onUseLocation ? (
          <button
            type="button"
            onClick={onUseLocation}
            className="text-xs font-semibold text-[var(--cat-accent)]"
          >
            {locating ? "Finding you…" : "Use my location"}
          </button>
        ) : null}
      </div>
      <input
        required={field.required}
        type={field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
