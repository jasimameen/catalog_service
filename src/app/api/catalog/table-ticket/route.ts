import { getServiceClient } from "@/lib/supabase/service";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { parseTemplateSettings } from "@/lib/catalog/template-settings";
import { isTerminalStatus, parseOrderStatuses } from "@/lib/catalog/order-statuses";
import { formatSelectedOptions } from "@/lib/catalog/item-options";
import type { CatalogRow, OrderItemRow, OrderRow, SelectedOption } from "@/lib/supabase/types";

function clean(value: unknown, max = 80): string {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Ordering is not configured yet." }, { status: 500 });
  }
  const url = new URL(request.url);
  const catalogId = clean(url.searchParams.get("catalogId"), 80);
  const tableNo = clean(url.searchParams.get("tableNo"), 16);
  if (!catalogId || !tableNo) {
    return Response.json({ error: "Table is required." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: catalogData } = await supabase.from("catalogs").select("*").eq("id", catalogId).maybeSingle();
  const catalog = catalogData as CatalogRow | null;
  if (!catalog || catalog.status !== "live") {
    return Response.json({ error: "This catalog is not available." }, { status: 404 });
  }
  const settings = parseTemplateSettings(catalog.template_settings);
  if (!settings.restaurant.dineInQr) {
    return Response.json({ error: "Table ordering is off." }, { status: 403 });
  }

  const since = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  const { data: orderRows } = await supabase
    .from("orders")
    .select("*")
    .eq("catalog_id", catalogId)
    .eq("fulfillment", "dine_in")
    .eq("table_no", tableNo)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const statuses = parseOrderStatuses(catalog.order_statuses);
  const orders = ((orderRows ?? []) as OrderRow[]).filter(
    (row) => row.catalog_id === catalogId && row.status !== "cancelled",
  );
  const ids = orders.map((row) => row.id);
  const { data: lineRows } =
    ids.length > 0 ? await supabase.from("order_items").select("*").in("order_id", ids) : { data: [] as OrderItemRow[] };
  const items = (lineRows ?? []) as OrderItemRow[];

  const rounds = orders.map((order) => ({
    id: order.id,
    reference: order.reference,
    status: order.status,
    open: !isTerminalStatus(order.status, statuses),
    createdAt: order.created_at,
    items: items
      .filter((line) => line.order_id === order.id)
      .map((line) => ({
        name: line.name,
        qty: line.qty,
        extras: formatSelectedOptions(Array.isArray(line.options_json) ? (line.options_json as SelectedOption[]) : []),
        notes: line.notes ?? "",
      })),
  }));

  return Response.json({
    tableNo,
    rounds,
    itemCount: rounds.reduce((sum, round) => sum + round.items.reduce((n, line) => n + line.qty, 0), 0),
  });
}
