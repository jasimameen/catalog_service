import { formatMoney } from "./currency";
import { formatSelectedOptions } from "./item-options";
import { formatOrderDateTime } from "./order-statuses";
import type { OrderItemRow, OrderRow, SelectedOption } from "@/lib/supabase/types";

export const PRINT_TICKET_PLACEHOLDERS = [
  "{{shop}}",
  "{{order_code}}",
  "{{table}}",
  "{{items}}",
  "{{total}}",
  "{{guest}}",
  "{{time}}",
] as const;

export const DEFAULT_PRINT_TICKET_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
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
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableLabel(order: OrderRow): string {
  const no = (order.table_no ?? "").trim();
  return no ? `Table ${no}` : "No table";
}

function guestLabel(order: OrderRow): string {
  return (order.shop_name || "Guest").trim() || "Guest";
}

function itemsHtml(lines: OrderItemRow[], currency: string): string {
  if (lines.length === 0) return `<p class="meta">No items</p>`;
  const rows = lines
    .map((line) => {
      const extras = formatSelectedOptions(
        Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : [],
      );
      const notes = (line.notes ?? "").trim();
      const detail = [extras, notes].filter(Boolean).join(" · ");
      return `<tr>
        <td>${escapeHtml(`${line.qty}× ${line.name}`)}${detail ? `<span class="extras">${escapeHtml(detail)}</span>` : ""}</td>
        <td>${escapeHtml(formatMoney(Number(line.line_total), currency))}</td>
      </tr>`;
    })
    .join("");
  return `<table class="items">${rows}</table>`;
}

export function printTicketSource(template: string | null | undefined): string {
  const raw = typeof template === "string" ? template.trim() : "";
  return raw || DEFAULT_PRINT_TICKET_HTML;
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
    "{{items}}": itemsHtml(args.lines, args.currency),
    "{{total}}": escapeHtml(formatMoney(Number(args.order.subtotal), args.currency)),
    "{{guest}}": escapeHtml(guestLabel(args.order)),
    "{{time}}": escapeHtml(formatOrderDateTime(args.order.created_at)),
  };
  let html = source;
  for (const key of PRINT_TICKET_PLACEHOLDERS) {
    html = html.split(key).join(values[key]);
  }
  if (!/<\/html>/i.test(html)) {
    return `<!doctype html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;
  }
  return html;
}
