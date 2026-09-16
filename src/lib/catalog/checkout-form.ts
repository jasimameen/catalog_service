import type {
  CheckoutFields,
  CheckoutFormField,
  CheckoutFormFieldType,
  OrderFulfillment,
} from "@/lib/supabase/types";
import { CHECKOUT_FIELD_KEYS, CHECKOUT_FIELD_LABELS } from "./checkout-fields";

export const FULFILLMENTS: { value: OrderFulfillment; label: string }[] = [
  { value: "dine_in", label: "Dine in" },
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
];

export const FORM_FIELD_TYPES: { value: CheckoutFormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Choice" },
  { value: "number", label: "Number" },
];

const TYPES = new Set<CheckoutFormFieldType>(["text", "tel", "textarea", "select", "number"]);
const MODES = new Set<OrderFulfillment>(["dine_in", "pickup", "delivery"]);

const FIELD_UI_LABEL: Record<(typeof CHECKOUT_FIELD_KEYS)[number], string> = {
  shopName: "Shop name",
  phone: "Phone",
  address: "Delivery address",
  maps: "Maps link",
  notes: "Notes",
};

function asId(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 64).replace(/\s+/g, "_") : "";
}

function asLabel(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function parseShowWhen(raw: unknown): OrderFulfillment[] | undefined {
  if (typeof raw === "string" && MODES.has(raw as OrderFulfillment)) {
    return [raw as OrderFulfillment];
  }
  if (!Array.isArray(raw)) return undefined;
  const modes = raw.filter((v): v is OrderFulfillment => typeof v === "string" && MODES.has(v as OrderFulfillment));
  return modes.length > 0 ? modes : undefined;
}

export function parseFulfillmentModes(raw: unknown): OrderFulfillment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is OrderFulfillment => typeof v === "string" && MODES.has(v as OrderFulfillment));
}

export function parseCheckoutFormField(raw: unknown): CheckoutFormField | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = asId(obj.id) || asId(obj.label);
  const label = asLabel(obj.label);
  if (!id || !label) return null;
  const type: CheckoutFormFieldType =
    typeof obj.type === "string" && TYPES.has(obj.type as CheckoutFormFieldType)
      ? (obj.type as CheckoutFormFieldType)
      : "text";
  const options = Array.isArray(obj.options)
    ? obj.options.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim().slice(0, 80))
    : undefined;
  return {
    id,
    label,
    type,
    required: Boolean(obj.required),
    options: type === "select" ? options : undefined,
    show_when: parseShowWhen(obj.show_when),
  };
}

export function parseCheckoutForm(raw: unknown): CheckoutFormField[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseCheckoutFormField).filter((f): f is CheckoutFormField => f !== null);
}

export function fallbackFormFromCheckoutFields(fields: CheckoutFields): CheckoutFormField[] {
  const rows: CheckoutFormField[] = [];
  for (const key of CHECKOUT_FIELD_KEYS) {
    if (fields[key] === "hidden") continue;
    const type: CheckoutFormFieldType =
      key === "phone" ? "tel" : key === "address" || key === "notes" ? "textarea" : "text";
    rows.push({
      id: key,
      label: FIELD_UI_LABEL[key],
      type,
      required: fields[key] === "required",
    });
  }
  return rows;
}

/** Custom form if the merchant set one; otherwise the old checkout_fields modes. */
export function resolveCheckoutForm(
  checkoutForm: unknown,
  checkoutFields: CheckoutFields,
): CheckoutFormField[] {
  const custom = parseCheckoutForm(checkoutForm);
  return custom.length > 0 ? custom : fallbackFormFromCheckoutFields(checkoutFields);
}

export function visibleCheckoutFields(
  fields: CheckoutFormField[],
  fulfillment: OrderFulfillment | null,
): CheckoutFormField[] {
  return fields.filter((field) => {
    if (!field.show_when || field.show_when.length === 0) return true;
    if (!fulfillment) return false;
    return field.show_when.includes(fulfillment);
  });
}

export function restaurantPresetFields(): CheckoutFormField[] {
  return [
    { id: "name", label: "Your name", type: "text", required: true },
    { id: "phone", label: "Phone", type: "tel", required: true },
    { id: "table", label: "Table number", type: "text", required: true, show_when: ["dine_in"] },
    { id: "address", label: "Delivery address", type: "textarea", required: true, show_when: ["delivery"] },
    { id: "notes", label: "Notes", type: "textarea", required: false },
  ];
}

export const RESTAURANT_PRESET_MODES: OrderFulfillment[] = ["dine_in", "pickup", "delivery"];

const NAME_IDS = new Set(["name", "shopName", "shop_name", "customer"]);
const PHONE_IDS = new Set(["phone", "tel", "mobile"]);
const ADDRESS_IDS = new Set(["address", "location", "delivery_address"]);
const MAPS_IDS = new Set(["maps", "mapsLink", "maps_link"]);
const NOTES_IDS = new Set(["notes", "note", "special_requests"]);
const TABLE_IDS = new Set(["table", "table_no", "tableNo"]);

export type MappedCheckoutValues = {
  shopName: string;
  phone: string;
  location: string;
  mapsLink: string;
  notes: string;
  tableNo: string;
  extras: Record<string, string>;
};

export function mapFormValues(
  fields: CheckoutFormField[],
  values: Record<string, string>,
): MappedCheckoutValues {
  const extras: Record<string, string> = {};
  let shopName = "";
  let phone = "";
  let location = "";
  let mapsLink = "";
  let notes = "";
  let tableNo = "";

  for (const field of fields) {
    const value = (values[field.id] ?? "").trim();
    if (!value) continue;
    if (NAME_IDS.has(field.id)) shopName = value;
    else if (PHONE_IDS.has(field.id)) phone = value;
    else if (ADDRESS_IDS.has(field.id)) location = value;
    else if (MAPS_IDS.has(field.id)) mapsLink = value;
    else if (NOTES_IDS.has(field.id)) notes = value;
    else if (TABLE_IDS.has(field.id)) tableNo = value;
    else extras[field.id] = value;
  }

  if (!shopName && values.shopName) shopName = values.shopName.trim();
  if (!phone && values.phone) phone = values.phone.trim();
  if (!location && values.location) location = values.location.trim();

  return { shopName, phone, location, mapsLink, notes, tableNo, extras };
}

export function missingCustomFieldLabels(
  fields: CheckoutFormField[],
  values: Record<string, string>,
): string[] {
  const missing: string[] = [];
  for (const field of fields) {
    if (!field.required) continue;
    if (!(values[field.id] ?? "").trim()) missing.push(field.label.toLowerCase());
  }
  return missing;
}

export function fulfillmentLabel(value: OrderFulfillment | null | undefined): string {
  if (!value) return "";
  return FULFILLMENTS.find((f) => f.value === value)?.label ?? value;
}

export function newFormFieldId(): string {
  return `f_${Math.random().toString(36).slice(2, 8)}`;
}

export { CHECKOUT_FIELD_LABELS };
