import { formatMoney } from "./currency";
import { formatSelectedOptions } from "./item-options";
import { formatOrderDateTime } from "./order-statuses";
import { escapeHtml, sanitizePrintHtml } from "./print-sanitize";
import type { OrderItemRow, OrderRow, SelectedOption } from "@/lib/supabase/types";

export const PRINT_TICKET_PLACEHOLDERS = [
  "{{shop}}",
  "{{order_code}}",
  "{{table}}",
  "{{items}}",
  "{{items_plain}}",
  "{{items_invoice}}",
  "{{total}}",
  "{{guest}}",
  "{{time}}",
] as const;

export type PrintTemplateId = "receipt" | "kitchen" | "guest" | "wide";

export type PrintTicketTemplate = {
  id: PrintTemplateId;
  label: string;
  hint: string;
  html: string;
};

export const PRINT_TICKET_TEMPLATES: PrintTicketTemplate[] = [
  {
    id: "receipt",
    label: "Receipt 80mm",
    hint: "Classic kitchen / guest ticket",
    html: `<!doctype html>
<html>
<head>
<title>{{order_code}}</title>
<style>
  @page { margin: 8mm; size: 80mm auto; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #101720; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .meta { font-size: 12px; color: #5a6472; margin: 0 0 12px; }
  .items { width: 100%; border-collapse: collapse; font-size: 13px; }
  .items td { padding: 5px 0; vertical-align: top; border-bottom: 1px solid #edf0f4; }
  .items td:last-child { text-align: right; white-space: nowrap; padding-left: 10px; }
  .extras { display: block; font-size: 11px; color: #5a6472; }
  .total { margin-top: 12px; font-size: 16px; font-weight: 600; }
</style>
</head>
<body>
  <h1>{{shop}}</h1>
  <p class="meta">{{order_code}} · {{table}} · {{guest}} · {{time}}</p>
  {{items}}
  <p class="total">{{total}}</p>
</body>
</html>
`,
  },
  {
    id: "kitchen",
    label: "Kitchen",
    hint: "Items first, no prices",
    html: `<!doctype html>
<html>
<head>
<title>{{order_code}}</title>
<style>
  @page { margin: 6mm; size: 80mm auto; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #101720; margin: 0; }
  .lines { list-style: none; margin: 0; padding: 0; }
  .lines li { padding: 8px 0; border-bottom: 1px solid #edf0f4; font-size: 16px; font-weight: 650; }
  .extras { display: block; margin-top: 3px; font-size: 12px; font-weight: 400; color: #5a6472; }
  .meta { margin: 14px 0 0; font-size: 12px; color: #5a6472; }
  .shop { margin: 4px 0 0; font-size: 11px; color: #8a93a2; }
</style>
</head>
<body>
  {{items_plain}}
  <p class="meta">{{order_code}} · {{table}} · {{guest}}</p>
  <p class="shop">{{shop}} · {{time}}</p>
</body>
</html>
`,
  },
  {
    id: "guest",
    label: "Guest bill",
    hint: "Totals, shop name, thank-you",
    html: `<!doctype html>
<html>
<head>
<title>{{order_code}}</title>
<style>
  @page { margin: 10mm; size: 80mm auto; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #101720; margin: 0; }
  header { text-align: center; margin: 0 0 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.03em; }
  .thanks { margin: 0; font-size: 12px; color: #5a6472; }
  .meta { font-size: 11px; color: #8a93a2; text-align: center; margin: 0 0 14px; }
  .items { width: 100%; border-collapse: collapse; font-size: 13px; }
  .items td { padding: 6px 0; vertical-align: top; border-bottom: 1px solid #edf0f4; }
  .items td:last-child { text-align: right; white-space: nowrap; padding-left: 10px; }
  .extras { display: block; font-size: 11px; color: #5a6472; }
  .bill { margin-top: 16px; padding-top: 10px; border-top: 2px solid #101720; display: flex; justify-content: space-between; align-items: baseline; }
  .bill span { font-size: 12px; color: #5a6472; }
  .bill strong { font-size: 18px; }
  .bye { margin: 18px 0 0; text-align: center; font-size: 12px; color: #5a6472; }
</style>
</head>
<body>
  <header>
    <h1>{{shop}}</h1>
    <p class="thanks">Thank you for visiting</p>
  </header>
  <p class="meta">{{order_code}} · {{table}} · {{guest}} · {{time}}</p>
  {{items}}
  <p class="bill"><span>Total</span> <strong>{{total}}</strong></p>
  <p class="bye">Please come again</p>
</body>
</html>
`,
  },
  {
    id: "wide",
    label: "Wide / A4",
    hint: "Invoice layout for browser print",
    html: `<!doctype html>
<html>
<head>
<title>{{order_code}}</title>
<style>
  @page { margin: 16mm; size: A4; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #101720; margin: 0; max-width: 720px; }
  header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 2px solid #101720; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.03em; }
  .sub { margin: 0; font-size: 13px; color: #5a6472; }
  .ref { text-align: right; font-size: 13px; }
  .ref strong { display: block; font-size: 16px; }
  .invoice { width: 100%; border-collapse: collapse; font-size: 13px; }
  .invoice th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a93a2; padding: 0 0 8px; border-bottom: 1px solid #d7dde6; }
  .invoice th:last-child, .invoice td:last-child { text-align: right; }
  .invoice td { padding: 8px 0; vertical-align: top; border-bottom: 1px solid #edf0f4; }
  .extras { display: block; font-size: 11px; color: #5a6472; }
  .total { margin-top: 18px; text-align: right; font-size: 18px; font-weight: 650; }
  .foot { margin-top: 28px; font-size: 12px; color: #8a93a2; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>{{shop}}</h1>
      <p class="sub">{{guest}} · {{table}}</p>
    </div>
    <div class="ref">
      <strong>{{order_code}}</strong>
      {{time}}
    </div>
  </header>
  {{items_invoice}}
  <p class="total">Total {{total}}</p>
  <p class="foot">Thank you — {{shop}}</p>
</body>
</html>
`,
  },
];

export const DEFAULT_PRINT_TICKET_HTML =
  PRINT_TICKET_TEMPLATES.find((t) => t.id === "receipt")?.html ?? "";

export function printTicketTemplateById(id: string): PrintTicketTemplate | undefined {
  return PRINT_TICKET_TEMPLATES.find((t) => t.id === id);
}

export function matchPrintTemplateId(html: string | null | undefined): PrintTemplateId | null {
  const raw = typeof html === "string" ? html.trim() : "";
  if (!raw) return "receipt";
  const found = PRINT_TICKET_TEMPLATES.find((t) => t.html.trim() === raw);
  return found?.id ?? null;
}

function tableLabel(order: OrderRow): string {
  const no = (order.table_no ?? "").trim();
  return no ? `Table ${no}` : "No table";
}

function guestLabel(order: OrderRow): string {
  return (order.shop_name || "Guest").trim() || "Guest";
}

function lineDetail(line: OrderItemRow): string {
  const extras = formatSelectedOptions(
    Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : [],
  );
  const notes = (line.notes ?? "").trim();
  return [extras, notes].filter(Boolean).join(" · ");
}

function itemsPricedHtml(lines: OrderItemRow[], currency: string): string {
  if (lines.length === 0) return `<p class="meta">No items</p>`;
  const rows = lines
    .map((line) => {
      const detail = lineDetail(line);
      return `<tr>
        <td>${escapeHtml(`${line.qty}× ${line.name}`)}${detail ? `<span class="extras">${escapeHtml(detail)}</span>` : ""}</td>
        <td>${escapeHtml(formatMoney(Number(line.line_total), currency))}</td>
      </tr>`;
    })
    .join("");
  return `<table class="items">${rows}</table>`;
}

function itemsPlainHtml(lines: OrderItemRow[]): string {
  if (lines.length === 0) return `<p class="meta">No items</p>`;
  const rows = lines
    .map((line) => {
      const detail = lineDetail(line);
      return `<li>${escapeHtml(`${line.qty}× ${line.name}`)}${detail ? `<span class="extras">${escapeHtml(detail)}</span>` : ""}</li>`;
    })
    .join("");
  return `<ul class="lines">${rows}</ul>`;
}

function itemsInvoiceHtml(lines: OrderItemRow[], currency: string): string {
  if (lines.length === 0) return `<p class="meta">No items</p>`;
  const rows = lines
    .map((line) => {
      const detail = lineDetail(line);
      return `<tr>
        <td>${escapeHtml(String(line.qty))}</td>
        <td>${escapeHtml(line.name)}${detail ? `<span class="extras">${escapeHtml(detail)}</span>` : ""}</td>
        <td>${escapeHtml(formatMoney(Number(line.line_total), currency))}</td>
      </tr>`;
    })
    .join("");
  return `<table class="invoice">
    <thead><tr><th>Qty</th><th>Item</th><th>Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function printTicketSource(template: string | null | undefined): string {
  const raw = typeof template === "string" ? template.trim() : "";
  return raw || DEFAULT_PRINT_TICKET_HTML;
}

export function samplePrintOrder(args: {
  shop: string;
  currency: string;
}): { shop: string; order: OrderRow; lines: OrderItemRow[]; currency: string } {
  const now = new Date().toISOString();
  return {
    shop: args.shop.trim() || "Catalog",
    currency: args.currency,
    order: {
      id: "preview",
      catalog_id: "preview",
      reference: "KLE-1842",
      shop_name: "Aisha",
      phone: "",
      location: "",
      maps_link: null,
      notes: null,
      subtotal: 42,
      status: "new",
      fulfillment: "dine_in",
      table_no: "12",
      created_at: now,
    },
    lines: [
      {
        id: "1",
        order_id: "preview",
        code: "KAR",
        category: "Drinks",
        name: "Karak",
        price: 12,
        qty: 2,
        line_total: 24,
        options_json: [{ group: "Sugar", values: [{ name: "Less sugar", price_delta: 0 }] }],
        notes: null,
      },
      {
        id: "2",
        order_id: "preview",
        code: "MAN",
        category: "Bakery",
        name: "Cheese manakish",
        price: 18,
        qty: 1,
        line_total: 18,
        notes: "Cut in four",
      },
    ],
  };
}

export function renderPrintTicketHtml(args: {
  template?: string | null;
  shop: string;
  order: OrderRow;
  lines: OrderItemRow[];
  currency: string;
}): string {
  const source = printTicketSource(args.template);
  const values: Record<(typeof PRINT_TICKET_PLACEHOLDERS)[number], string> = {
    "{{shop}}": escapeHtml(args.shop.trim() || "Catalog"),
    "{{order_code}}": escapeHtml(args.order.reference),
    "{{table}}": escapeHtml(tableLabel(args.order)),
    "{{items}}": itemsPricedHtml(args.lines, args.currency),
    "{{items_plain}}": itemsPlainHtml(args.lines),
    "{{items_invoice}}": itemsInvoiceHtml(args.lines, args.currency),
    "{{total}}": escapeHtml(formatMoney(Number(args.order.subtotal), args.currency)),
    "{{guest}}": escapeHtml(guestLabel(args.order)),
    "{{time}}": escapeHtml(formatOrderDateTime(args.order.created_at)),
  };
  let html = source;
  for (const key of PRINT_TICKET_PLACEHOLDERS) {
    html = html.split(key).join(values[key]);
  }
  return sanitizePrintHtml(html);
}
