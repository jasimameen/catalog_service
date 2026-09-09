import nodemailer from "nodemailer";
import { getServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { generateOrderReference, formatMoney } from "@/lib/catalog/currency";
import type { OrderPayload } from "@/lib/catalog/order-types";
import type { CatalogItemRow, CatalogRow } from "@/lib/supabase/types";

function clean(value: unknown, max = 300): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
  const shopName = clean(body.shopName, 120);
  const phone = clean(body.phone, 40);
  const location = clean(body.location, 300);
  const mapsLink = clean(body.mapsLink, 300);
  const notes = clean(body.notes, 500);
  const requestedItems = Array.isArray(body.items) ? body.items : [];

  if (!catalogId) {
    return Response.json({ error: "Missing catalog." }, { status: 400 });
  }
  if (!shopName || !phone || !location) {
    return Response.json(
      { error: "Shop name, phone number, and location are required." },
      { status: 400 }
    );
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

  const { data: itemRows } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("catalog_id", catalogId)
    .eq("visible", true);

  const catalogItems = (itemRows as CatalogItemRow[] | null) ?? [];

  // Recompute items from server-side catalog data — never trust client-sent prices.
  const items = requestedItems
    .map((entry) => {
      const item = catalogItems.find((p) => p.code === entry.code);
      const qty = Math.floor(Number(entry.qty));
      if (!item || !Number.isFinite(qty) || qty <= 0) return null;
      return {
        code: item.code,
        category: item.category,
        name: item.name,
        price: Number(item.price),
        qty,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const reference = generateOrderReference(catalog.slug);

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      catalog_id: catalogId,
      reference,
      shop_name: shopName,
      phone,
      location,
      maps_link: mapsLink || null,
      notes: notes || null,
      subtotal: total,
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    console.error("Catalog order: failed to save order", orderError);
    return Response.json({ error: "Could not save your order. Please try again." }, { status: 500 });
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
    })),
  );

  if (itemsError) {
    console.error("Catalog order: failed to save order items", itemsError);
    await supabase.from("orders").delete().eq("id", orderRow.id);
    return Response.json({ error: "Could not save your order. Please try again." }, { status: 500 });
  }

  await sendOrderEmail({ catalog, items, total, reference, shopName, phone, location, mapsLink, notes });

  return Response.json({
    ok: true,
    total,
    reference,
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    lineCount: items.length,
  });
}

async function sendOrderEmail(args: {
  catalog: CatalogRow;
  items: { code: string; name: string; price: number; qty: number }[];
  total: number;
  reference: string;
  shopName: string;
  phone: string;
  location: string;
  mapsLink: string;
  notes: string;
}) {
  const { catalog, items, total, reference, shopName, phone, location, mapsLink, notes } = args;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, ORDER_FROM_EMAIL } =
    process.env;
  const toEmail = catalog.order_email;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !toEmail) {
    // Order is already saved in Supabase and visible in the Admin inbox even
    // if email isn't configured for this catalog yet — don't fail the request.
    console.warn(
      `Catalog order ${reference}: email not sent (SMTP not configured, or catalog has no order_email).`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const itemRows = items
    .map(
      (item) =>
        `${item.code} ${item.name} — qty ${item.qty} × ${formatMoney(item.price, catalog.currency)} = ${formatMoney(item.price * item.qty, catalog.currency)}`
    )
    .join("\n");

  const textBody = `New ${catalog.name} order — ${reference}

Shop name: ${shopName}
Phone: ${phone}
Location: ${location}
${mapsLink ? `Maps link: ${mapsLink}\n` : ""}${notes ? `Notes: ${notes}\n` : ""}
Items:
${itemRows}

Total: ${formatMoney(total, catalog.currency)}
`;

  const itemRowsHtml = items
    .map(
      (item) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${item.code}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.qty}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.price, catalog.currency)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.price * item.qty, catalog.currency)}</td>
      </tr>`
    )
    .join("");

  const htmlBody = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:640px;">
      <h2 style="margin:0 0 4px;">New ${catalog.name} order</h2>
      <p style="margin:0 0 12px;color:#46505e;">Reference: <strong>${reference}</strong></p>
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
    </div>
  `;

  try {
    await transporter.sendMail({
      from: ORDER_FROM_EMAIL || SMTP_USER,
      to: toEmail,
      subject: `New order ${reference} from ${shopName} (${phone})`,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    // The order is already saved — a mail failure shouldn't fail the checkout
    // for the customer. It's still visible in the Admin inbox.
    console.error(`Catalog order ${reference}: failed to send email`, error);
  }
}
