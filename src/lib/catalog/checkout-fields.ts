import type { CheckoutFieldMode, CheckoutFields } from "@/lib/supabase/types";

export const DEFAULT_CHECKOUT_FIELDS: CheckoutFields = {
  shopName: "required",
  phone: "required",
  address: "required",
  maps: "optional",
  notes: "optional",
  phonePrefix: "",
  orderPrefix: "",
};

export const CHECKOUT_FIELD_KEYS = ["shopName", "phone", "address", "maps", "notes"] as const;

export const CHECKOUT_FIELD_LABELS: Record<(typeof CHECKOUT_FIELD_KEYS)[number], string> = {
  shopName: "shop name",
  phone: "phone number",
  address: "delivery address",
  maps: "maps link",
  notes: "notes",
};

const MODES = new Set<CheckoutFieldMode>(["required", "optional", "hidden"]);

function asMode(value: unknown, fallback: CheckoutFieldMode): CheckoutFieldMode {
  return typeof value === "string" && MODES.has(value as CheckoutFieldMode)
    ? (value as CheckoutFieldMode)
    : fallback;
}

function asPrefix(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 16) : "";
}

export function parseCheckoutFields(raw: unknown): CheckoutFields {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    shopName: asMode(obj.shopName, DEFAULT_CHECKOUT_FIELDS.shopName),
    phone: asMode(obj.phone, DEFAULT_CHECKOUT_FIELDS.phone),
    address: asMode(obj.address, DEFAULT_CHECKOUT_FIELDS.address),
    maps: asMode(obj.maps, DEFAULT_CHECKOUT_FIELDS.maps),
    notes: asMode(obj.notes, DEFAULT_CHECKOUT_FIELDS.notes),
    phonePrefix: asPrefix(obj.phonePrefix),
    orderPrefix: asPrefix(obj.orderPrefix),
  };
}

export function checkoutFieldsFromForm(formData: FormData): CheckoutFields {
  return parseCheckoutFields({
    shopName: formData.get("cf_shopName"),
    phone: formData.get("cf_phone"),
    address: formData.get("cf_address"),
    maps: formData.get("cf_maps"),
    notes: formData.get("cf_notes"),
    phonePrefix: formData.get("phonePrefix"),
    orderPrefix: formData.get("orderPrefix"),
  });
}

export function missingRequiredLabels(
  fields: CheckoutFields,
  values: {
    shopName: string;
    phone: string;
    address: string;
    maps: string;
    notes: string;
  },
): string[] {
  const missing: string[] = [];
  for (const key of CHECKOUT_FIELD_KEYS) {
    if (fields[key] === "required" && !values[key].trim()) {
      missing.push(CHECKOUT_FIELD_LABELS[key]);
    }
  }
  return missing;
}

/** Prepend the merchant prefix unless the customer already typed it. */
export function applyPhonePrefix(phone: string, prefix: string): string {
  const trimmed = phone.trim();
  const p = prefix.trim();
  if (!p || !trimmed) return trimmed;
  const digitsPrefix = p.replace(/\D/g, "");
  const digitsPhone = trimmed.replace(/\D/g, "");
  if (digitsPrefix && digitsPhone.startsWith(digitsPrefix)) return trimmed;
  if (trimmed.startsWith(p)) return trimmed;
  return `${p} ${trimmed}`.replace(/\s+/g, " ").trim();
}
