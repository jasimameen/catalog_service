import { NextRequest, NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth/current-account";
import { getCatalogAdminClient, getCatalogOrNotFound } from "@/app/admin/_lib/data";
import type { OrderItemRow, OrderRow, SelectedOption } from "@/lib/supabase/types";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import { fulfillmentLabel } from "@/lib/catalog/checkout-form";
import { parseOrderStatuses, statusLabel } from "@/lib/catalog/order-statuses";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = await params;
  await requireAccount();
  const catalog = await getCatalogOrNotFound(catalogId);
  const statuses = parseOrderStatuses(catalog.order_statuses);
  const supabase = await getCatalogAdminClient();

  const { data: ordersData } = await supabase
    .from("orders")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false });
  const orders = (ordersData ?? []) as OrderRow[];

  const orderIds = orders.map((o) => o.id);
  const { data: itemsData } =
    orderIds.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", orderIds)
      : { data: [] as OrderItemRow[] };
  const items = (itemsData ?? []) as OrderItemRow[];
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const header = [
    "Reference",
    "Created at",
    "Status",
    "Fulfillment",
    "Table",
    "Shop",
    "Phone",
    "Location",
    "Notes",
    "Item code",
    "Item name",
    "Options",
    "Unit price",
    "Qty",
    "Line total",
    "Order subtotal",
  ];

  const rows: string[] = [header.join(",")];

  for (const order of orders) {
    const lines = itemsByOrder.get(order.id) ?? [];
    if (lines.length === 0) {
      rows.push(
        [
          order.reference,
          order.created_at,
          statusLabel(statuses, order.status),
          fulfillmentLabel(order.fulfillment),
          order.table_no ?? "",
          order.shop_name,
          order.phone,
          order.location,
          order.notes ?? "",
          "",
          "",
          "",
          "",
          "",
          "",
          order.subtotal,
        ]
          .map(csvEscape)
          .join(","),
      );
      continue;
    }
    for (const line of lines) {
      rows.push(
        [
          order.reference,
          order.created_at,
          statusLabel(statuses, order.status),
          fulfillmentLabel(order.fulfillment),
          order.table_no ?? "",
          order.shop_name,
          order.phone,
          order.location,
          order.notes ?? "",
          line.code,
          line.name,
          formatSelectedOptions(Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : []),
          line.price,
          line.qty,
          line.line_total,
          order.subtotal,
        ]
          .map(csvEscape)
          .join(","),
      );
    }
  }

  const csv = rows.join("\n");
  const filename = `${catalog.slug}-orders.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
