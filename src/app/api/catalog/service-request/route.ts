import { getServiceClient } from "@/lib/supabase/service";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { parseTemplateSettings } from "@/lib/catalog/template-settings";
import { sendPushToAccount } from "@/lib/push/send";
import { catalogStorefrontLive } from "@/lib/billing/account-access";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return Response.json({ error: "Not configured." }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const catalogId = typeof body?.catalogId === "string" ? body.catalogId : "";
  const tableNo = typeof body?.tableNo === "string" ? body.tableNo.trim().slice(0, 16) : "";
  const kind = body?.kind === "bill" ? "bill" : "waiter";
  if (!catalogId) return Response.json({ error: "Missing catalog." }, { status: 400 });

  const supabase = getServiceClient();
  const { data: catalog } = await supabase
    .from("catalogs")
    .select("template_settings, status, account_id")
    .eq("id", catalogId)
    .maybeSingle();
  if (!catalog || catalog.status !== "live") return Response.json({ error: "Not available." }, { status: 404 });
  if (!(await catalogStorefrontLive(catalogId))) {
    return Response.json({ error: "This shop is paused." }, { status: 403 });
  }
  const settings = parseTemplateSettings(catalog.template_settings);
  if (kind === "waiter" && !settings.restaurant.callWaiter) {
    return Response.json({ error: "Call waiter is off." }, { status: 403 });
  }
  if (kind === "bill" && !settings.restaurant.requestBill) {
    return Response.json({ error: "Request bill is off." }, { status: 403 });
  }

  const { error } = await supabase.from("service_requests").insert({
    catalog_id: catalogId,
    table_no: tableNo || null,
    kind,
  });
  if (error) {
    if (error.code === "42P01" || error.message.includes("service_requests")) {
      return Response.json({ error: "Run supabase/template-settings.sql, then try again." }, { status: 500 });
    }
    return Response.json({ error: "Could not send." }, { status: 500 });
  }

  void sendPushToAccount(catalog.account_id, {
    title: kind === "bill" ? "Request bill" : "Call waiter",
    body: tableNo ? `Table ${tableNo}` : "A table needs you",
    data: { kind: "service_request", requestKind: kind, tableNo: tableNo || "", catalogId },
  }).then((result) => {
    if (!result.ok) console.error("service-request push", result.reason);
  });

  return Response.json({ ok: true });
}
