import nodemailer from "nodemailer";
import { PRODUCTS } from "@/data/catalog-products";
import type { OrderPayload } from "@/lib/catalog/order-types";

function clean(value: unknown, max = 300): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export async function POST(request: Request) {
  let body: OrderPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const shopName = clean(body.shopName, 120);
  const phone = clean(body.phone, 40);
  const location = clean(body.location, 300);
  const mapsLink = clean(body.mapsLink, 300);
  const notes = clean(body.notes, 500);
  const requestedItems = Array.isArray(body.items) ? body.items : [];

  if (!shopName || !phone || !location) {
    return Response.json(
      { error: "Shop name, phone number, and location are required." },
      { status: 400 }
    );
  }

  // Recompute items from server-side catalog data — never trust client-sent prices.
  const items = requestedItems
    .map((entry) => {
      const product = PRODUCTS.find((p) => p.code === entry.code);
      const qty = Math.floor(Number(entry.qty));
      if (!product || !Number.isFinite(qty) || qty <= 0) return null;
      return {
        code: product.code,
        category: product.category,
        price: product.price,
        qty,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const reference = `KL-${Math.floor(1000 + Math.random() * 9000)}`;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
    ORDER_FROM_EMAIL,
    ORDER_TO_EMAIL,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !ORDER_TO_EMAIL) {
    console.error("Catalog order: SMTP environment variables are not configured.");
    return Response.json(
      { error: "Ordering is not configured yet. Please contact the shop directly." },
      { status: 500 }
    );
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
        `${item.code} (${item.category}) — qty ${item.qty} × QAR ${item.price.toFixed(2)} = QAR ${(
          item.price * item.qty
        ).toFixed(2)}`
    )
    .join("\n");

  const textBody = `New Kleaner catalogue order — ${reference}

Shop name: ${shopName}
Phone: ${phone}
Location: ${location}
${mapsLink ? `Maps link: ${mapsLink}\n` : ""}${notes ? `Notes: ${notes}\n` : ""}
Items:
${itemRows}

Total: QAR ${total.toFixed(2)}
`;

  const itemRowsHtml = items
    .map(
      (item) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${item.code}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${item.category}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.qty}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">QAR ${item.price.toFixed(
          2
        )}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">QAR ${(
          item.price * item.qty
        ).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const htmlBody = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#15140f;max-width:640px;">
      <h2 style="margin:0 0 4px;">New Kleaner catalogue order</h2>
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
      <p style="margin-top:16px;font-size:16px;"><strong>Total: QAR ${total.toFixed(2)}</strong></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: ORDER_FROM_EMAIL || SMTP_USER,
      to: ORDER_TO_EMAIL,
      replyTo: undefined,
      subject: `New order ${reference} from ${shopName} (${phone})`,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error("Catalog order: failed to send email", error);
    return Response.json(
      { error: "Could not send the order. Please try again or contact the shop directly." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, total, reference, itemCount: items.reduce((s, i) => s + i.qty, 0), lineCount: items.length });
}
