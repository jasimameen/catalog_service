import { getServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/mail";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { generateOrderReference, formatMoney } from "@/lib/catalog/currency";
import { applyPhonePrefix, parseCheckoutFields } from "@/lib/catalog/checkout-fields";
import {
  fulfillmentLabel,
  mapFormValues,
  missingCustomFieldLabels,
  parseFulfillmentModes,
  resolveCheckoutForm,
  visibleCheckoutFields,
} from "@/lib/catalog/checkout-form";
import {
  formatComboIncludes,
  isComboItem,
  parseComboLines,
  resolveComboIncludes,
  type ComboSnapshot,
} from "@/lib/catalog/combos";
import { formatSelectedOptions, parseItemOptions, resolveSelectedOptions, unitPriceWithOptions } from "@/lib/catalog/item-options";
import type { OrderPayload } from "@/lib/catalog/order-types";
import { resolveIncomingOrderStatus } from "@/lib/catalog/order-statuses";
import { newTrackToken, trackingPath, trackingUrl } from "@/lib/catalog/order-tracking";
import { parseNotifyEmails, parseTemplateSettings } from "@/lib/catalog/template-settings";
import type { CatalogItemRow, CatalogRow, OrderFulfillment } from "@/lib/supabase/types";
import { sendPushToAccount } from "@/lib/push/send";

function clean(value: unknown, max = 300): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function asCoord(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > 180) return null;
  return n;
}

const FULFILLMENT_SET = new Set<OrderFulfillment>(["dine_in", "pickup", "delivery"]);

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json(
      { error: "Ordering is not configured yet. See SETUP.md." },
      { status: 500 }
    );
  }

  let body: OrderPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const catalogId = clean(body.catalogId, 100);
  const requestedItems = Array.isArray(body.items) ? body.items : [];

  if (!catalogId) {
    return Response.json({ error: "Missing catalog." }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: catalogData, error: catalogError } = await supabase
    .from("catalogs")
    .select("*")
    .eq("id", catalogId)
    .eq("status", "live")
    .maybeSingle();

  const catalog = catalogData as CatalogRow | null;
  if (catalogError || !catalog) {
    return Response.json({ error: "This catalog is not available." }, { status: 404 });
  }
  if (catalog.accept_orders === false) {
    return Response.json({ error: "This catalog is not taking orders." }, { status: 403 });
  }

  const checkout = parseCheckoutFields(catalog.checkout_fields);
  const formFields = resolveCheckoutForm(catalog.checkout_form, checkout);
  const modes = parseFulfillmentModes(catalog.fulfillment_modes);
  const fulfillmentRaw = typeof body.fulfillment === "string" ? body.fulfillment : null;
  const fulfillment: OrderFulfillment | null =
    fulfillmentRaw && FULFILLMENT_SET.has(fulfillmentRaw) ? fulfillmentRaw : null;

  if (modes.length > 0 && !fulfillment) {
    return Response.json({ error: "Choose dine in, pickup, or delivery." }, { status: 400 });
  }
  if (fulfillment && modes.length > 0 && !modes.includes(fulfillment)) {
    return Response.json({ error: "That order type is not available." }, { status: 400 });
  }

  const incomingValues: Record<string, string> = {};
  if (body.formValues && typeof body.formValues === "object") {
    for (const [key, value] of Object.entries(body.formValues)) {
      if (typeof value === "string") incomingValues[key] = value;
    }
  }
  function put(id: string, value: string) {
    if (value && !incomingValues[id]) incomingValues[id] = value;
  }
  put("shopName", clean(body.shopName, 120));
  put("name", clean(body.shopName, 120));
  put("phone", clean(body.phone, 40));
  put("location", clean(body.location, 300));
  put("address", clean(body.location, 300));
  put("maps", clean(body.mapsLink, 300));
  put("mapsLink", clean(body.mapsLink, 300));
  put("notes", clean(body.notes, 500));
  put("table", clean(body.tableNo, 40));
  put("table_no", clean(body.tableNo, 40));

  const templateSettings = parseTemplateSettings(catalog.template_settings);
  const tableHint = clean(body.tableNo, 40) || incomingValues.table || incomingValues.table_no || incomingValues.tableNo || "";
  const skipDineInDetails =
    fulfillment === "dine_in" && Boolean(tableHint) && templateSettings.restaurant.skipDineInDetails;
  const visibleRaw = visibleCheckoutFields(formFields, modes.length > 0 ? fulfillment : null);
  const visible = skipDineInDetails ? [] : visibleRaw;
  const missing = missingCustomFieldLabels(visible, incomingValues);
  if (missing.length > 0) {
    const list =
      missing.length === 1
        ? missing[0]
        : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
    return Response.json({ error: `${list.charAt(0).toUpperCase()}${list.slice(1)} ${missing.length === 1 ? "is" : "are"} required.` }, { status: 400 });
  }

  const mapped = mapFormValues(visible, incomingValues);
  const tableNo = mapped.tableNo || tableHint;
  const shopName =
    skipDineInDetails && tableNo
      ? mapped.shopName || clean(body.shopName, 120) || `Table ${tableNo}`
      : mapped.shopName || clean(body.shopName, 120);
  const phone = applyPhonePrefix(mapped.phone || clean(body.phone, 40), checkout.phonePrefix);
  const location = mapped.location || clean(body.location, 300);
  const mapsLink = mapped.mapsLink || clean(body.mapsLink, 300);
  const notes = mapped.notes || clean(body.notes, 500);
  const geoLat = asCoord(body.geoLat);
  const geoLng = asCoord(body.geoLng);
  const extraNote = Object.entries(mapped.extras)
    .map(([id, value]) => {
      const field = visible.find((f) => f.id === id);
      return field ? `${field.label}: ${value}` : `${id}: ${value}`;
    })
    .join("\n");
  const combinedNotes = [notes, extraNote].filter(Boolean).join("\n") || "";

  const { data: itemRows } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("catalog_id", catalogId)
    .eq("visible", true);

  const catalogItems = (itemRows as CatalogItemRow[] | null) ?? [];

  // Recompute items from server-side catalog data — never trust client-sent prices.
  const items: {
    code: string;
    category: string;
    name: string;
    price: number;
    qty: number;
    options: ReturnType<typeof resolveSelectedOptions>["options"];
    notes: string;
    combo: ComboSnapshot[];
  }[] = [];

  for (const entry of requestedItems) {
    const item = catalogItems.find((p) => p.code === entry.code);
    const qty = Math.floor(Number(entry.qty));
    if (!item || !Number.isFinite(qty) || qty <= 0) continue;
    const groups = parseItemOptions(item.options);
    const resolved = resolveSelectedOptions(groups, entry.options);
    if (resolved.error) {
      return Response.json({ error: resolved.error }, { status: 400 });
    }
    const price = unitPriceWithOptions(Number(item.price), resolved.options);
    const combo = isComboItem(item)
      ? resolveComboIncludes(parseComboLines(item.combo_lines), catalogItems).map((row) => ({
          item_id: row.item_id,
          code: row.code,
          name: row.name,
          qty: row.qty,
        }))
      : [];
    items.push({
      code: item.code,
      category: item.category,
      name: item.name,
      price,
      qty,
      options: resolved.options,
      notes: clean(entry.notes, 200),
      combo,
    });
  }

  if (items.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const reference = generateOrderReference(catalog.slug, checkout.orderPrefix);

  const status = resolveIncomingOrderStatus(catalog);
  const trackToken = newTrackToken();
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      catalog_id: catalogId,
      reference,
      shop_name: shopName,
      phone,
      location,
      maps_link: mapsLink || null,
      notes: combinedNotes || null,
      subtotal: total,
      status,
      track_token: trackToken,
      fulfillment,
      table_no: tableNo || null,
      geo_lat: geoLat,
      geo_lng: geoLng,
      form_values: incomingValues,
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    console.error("Catalog order: failed to save order", orderError);
    const hint =
      orderError?.code === "42703" || orderError?.message?.includes("fulfillment")
        ? " Run supabase/restaurant.sql in the Supabase SQL editor."
        : orderError?.code === "23514" || orderError?.message?.includes("orders_status_check")
          ? " Run supabase/order-statuses.sql in the Supabase SQL editor."
          : "";
    return Response.json({ error: `Could not save your order. Please try again.${hint}` }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: orderRow.id,
      code: item.code,
      category: item.category,
      name: item.name,
      price: item.price,
      qty: item.qty,
      line_total: item.price * item.qty,
      options_json: item.options,
      notes: item.notes || null,
      combo_json: item.combo,
    })),
  );

  if (itemsError) {
    console.error("Catalog order: failed to save order items", itemsError);
    await supabase.from("orders").delete().eq("id", orderRow.id);
    const hint =
      itemsError.code === "42703" || itemsError.message?.includes("combo_json")
        ? " Run supabase/combos.sql in the Supabase SQL editor."
        : "";
    return Response.json({ error: `Could not save your order. Please try again.${hint}` }, { status: 500 });
  }

  await supabase.from("order_status_events").insert({
    order_id: orderRow.id,
    from_status: null,
    to_status: status,
    actor: "customer",
  });

  const fulfillmentLabel =
    fulfillment === "dine_in" ? "Dine-in" : fulfillment === "delivery" ? "Delivery" : "Pickup";
  void sendPushToAccount(catalog.account_id, {
    title: `New ${fulfillmentLabel.toLowerCase()}`,
    body: tableNo ? `Table ${tableNo} · ${items.length} items` : `${shopName} · ${items.length} items`,
    data: { kind: "new_order", orderId: orderRow.id, fulfillment: fulfillment ?? "" },
  });

  const { data: domainRows } = await supabase
    .from("domains")
    .select("hostname, kind")
    .eq("catalog_id", catalogId)
    .eq("status", "verified");
  const customHost = (domainRows ?? []).find((row) => row.kind === "custom")?.hostname ?? null;
  const trackUrl = trackingUrl(catalog.slug, trackToken, customHost);
  const trackPath = trackingPath(catalog.slug, trackToken);

  await sendOrderEmail({
    catalog,
    items,
    total,
    reference,
    shopName,
    phone,
    location,
    mapsLink,
    notes: combinedNotes,
    fulfillment,
    tableNo,
    trackUrl,
  });

  return Response.json({
    ok: true,
    total,
    reference,
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    lineCount: items.length,
    trackUrl,
    trackPath,
    trackToken,
  });
}

async function sendOrderEmail(args: {
  catalog: CatalogRow;
  items: { code: string; name: string; price: number; qty: number; options: { group: string; values: { name: string }[] }[]; combo: ComboSnapshot[] }[];
  total: number;
  reference: string;
  shopName: string;
  phone: string;
  location: string;
  mapsLink: string;
  notes: string;
  fulfillment: OrderFulfillment | null;
  tableNo: string;
  trackUrl: string;
}) {
  const { catalog, items, total, reference, shopName, phone, location, mapsLink, notes, fulfillment, tableNo, trackUrl } = args;
  const { to: toEmail, cc } = await resolveOrderMailRecipients(catalog);

  if (!toEmail) {
    // Order is already saved in Supabase and visible in the Admin inbox even
    // if email isn't configured for this catalog yet — don't fail the request.
    console.warn(`Catalog order ${reference}: email not sent (no catalog or account order email).`);
    return;
  }

  const itemRows = items
    .map((item) => {
      const extras = formatSelectedOptions(item.options as Parameters<typeof formatSelectedOptions>[0]);
      const includes = item.combo.length > 0 ? ` [Includes ${formatComboIncludes(item.combo)}]` : "";
      return `${item.code} ${item.name}${extras ? ` (${extras})` : ""}${includes} — qty ${item.qty} × ${formatMoney(item.price, catalog.currency)} = ${formatMoney(item.price * item.qty, catalog.currency)}`;
    })
    .join("\n");

  const textBody = `New ${catalog.name} order — ${reference}

${fulfillment ? `Type: ${fulfillmentLabel(fulfillment)}\n` : ""}${tableNo ? `Table: ${tableNo}\n` : ""}Shop name: ${shopName}
Phone: ${phone}
Location: ${location}
${mapsLink ? `Maps link: ${mapsLink}\n` : ""}${notes ? `Notes: ${notes}\n` : ""}
Items:
${itemRows}

Total: ${formatMoney(total, catalog.currency)}

Track: ${trackUrl}
`;

  const itemRowsHtml = items
    .map((item) => {
      const extras = formatSelectedOptions(item.options as Parameters<typeof formatSelectedOptions>[0]);
      const includes = item.combo.length > 0 ? `Includes ${formatComboIncludes(item.combo)}` : "";
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${item.code}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${item.name}${extras ? `<br><span style="color:#6b7280;font-size:12px;">${extras}</span>` : ""}${includes ? `<br><span style="color:#6b7280;font-size:12px;">${includes}</span>` : ""}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.qty}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.price, catalog.currency)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.price * item.qty, catalog.currency)}</td>
      </tr>`;
    })
    .join("");

  const htmlBody = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:640px;">
      <h2 style="margin:0 0 4px;">New ${catalog.name} order</h2>
      <p style="margin:0 0 12px;color:#46505e;">Reference: <strong>${reference}</strong></p>
      ${fulfillment ? `<p style="margin:0 0 4px;"><strong>Type:</strong> ${fulfillmentLabel(fulfillment)}</p>` : ""}
      ${tableNo ? `<p style="margin:0 0 4px;"><strong>Table:</strong> ${tableNo}</p>` : ""}
      <p style="margin:0 0 4px;"><strong>Shop name:</strong> ${shopName}</p>
      <p style="margin:0 0 4px;"><strong>Phone:</strong> ${phone}</p>
      <p style="margin:0 0 4px;"><strong>Location:</strong> ${location}</p>
      ${mapsLink ? `<p style="margin:0 0 4px;"><strong>Maps link:</strong> <a href="${mapsLink}">${mapsLink}</a></p>` : ""}
      ${notes ? `<p style="margin:0 0 12px;"><strong>Notes:</strong> ${notes}</p>` : ""}
      <table style="border-collapse:collapse;width:100%;margin-top:12px;">
        <thead>
          <tr style="background:#f4f2ea;">
            <th style="padding:6px 10px;text-align:left;">Code</th>
            <th style="padding:6px 10px;text-align:left;">Item</th>
            <th style="padding:6px 10px;text-align:center;">Qty</th>
            <th style="padding:6px 10px;text-align:right;">Unit price</th>
            <th style="padding:6px 10px;text-align:right;">Line total</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>
      <p style="margin-top:16px;font-size:16px;"><strong>Total: ${formatMoney(total, catalog.currency)}</strong></p>
      <p style="margin-top:12px;"><a href="${trackUrl}">Track this order</a></p>
    </div>
  `;

  try {
    const sent = await sendMail({
      to: toEmail,
      cc: cc || undefined,
      subject: `New order ${reference} from ${shopName || "a customer"}${phone ? ` (${phone})` : ""}`,
      text: textBody,
      html: htmlBody,
    });
    if (!sent) {
      console.warn(`Catalog order ${reference}: email not sent (SMTP not configured).`);
    }
  } catch (error) {
    // The order is already saved — a mail failure shouldn't fail the checkout
    // for the customer. It's still visible in the Admin inbox.
    console.error(`Catalog order ${reference}: failed to send email`, error);
  }
}

async function resolveOrderMailRecipients(catalog: CatalogRow): Promise<{ to: string; cc: string }> {
  const extras = parseNotifyEmails(parseTemplateSettings(catalog.template_settings).notify.emailCc);
  const supabase = getServiceClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("order_email, order_email_cc")
    .eq("id", catalog.account_id)
    .maybeSingle();
  const fallback = typeof account?.order_email === "string" ? account.order_email.trim() : "";
  const accountCc = parseNotifyEmails(account?.order_email_cc ?? "");
  const to = (catalog.order_email || fallback || extras[0] || "").trim();
  const cc = [...extras, ...accountCc]
    .filter((email) => email && email !== to.toLowerCase())
    .filter((email, index, all) => all.indexOf(email) === index)
    .join(", ");
  return { to, cc };
}
