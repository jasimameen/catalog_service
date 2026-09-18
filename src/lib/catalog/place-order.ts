import type { OrderFulfillment, SelectedOption } from "@/lib/supabase/types";
import type { OrderResult } from "./order-types";

export async function submitCatalogOrder(input: {
  catalogId: string;
  fulfillment: OrderFulfillment | null;
  tableNo?: string;
  shopName?: string;
  phone?: string;
  location?: string;
  mapsLink?: string;
  notes?: string;
  geoLat?: number | null;
  geoLng?: number | null;
  formValues?: Record<string, string>;
  items: { code: string; qty: number; options?: SelectedOption[]; notes?: string }[];
}): Promise<{ ok: true; result: OrderResult } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/catalog/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogId: input.catalogId,
        shopName: input.shopName ?? "",
        phone: input.phone ?? "",
        location: input.location ?? "",
        mapsLink: input.mapsLink ?? "",
        notes: input.notes ?? "",
        fulfillment: input.fulfillment,
        tableNo: input.tableNo ?? "",
        geoLat: input.geoLat,
        geoLng: input.geoLng,
        formValues: input.formValues ?? {},
        items: input.items,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      reference?: string;
      total?: number;
      itemCount?: number;
      lineCount?: number;
      trackUrl?: string;
      trackPath?: string;
      trackToken?: string;
    } | null;
    if (!res.ok || !data?.reference || typeof data.total !== "number") {
      return { ok: false, error: data?.error || "Could not send that order." };
    }
    return {
      ok: true,
      result: {
        reference: data.reference,
        total: data.total,
        itemCount: data.itemCount ?? 0,
        lineCount: data.lineCount ?? 0,
        shopName: input.shopName ?? "",
        phone: input.phone ?? "",
        trackUrl: typeof data.trackUrl === "string" ? data.trackUrl : undefined,
        trackPath: typeof data.trackPath === "string" ? data.trackPath : undefined,
        trackToken: typeof data.trackToken === "string" ? data.trackToken : undefined,
      },
    };
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
}
