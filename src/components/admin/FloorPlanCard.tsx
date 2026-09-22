import Link from "next/link";
import type { CatalogTemplateKey } from "@/lib/catalog/types";
import type { OrderFulfillment } from "@/lib/supabase/types";
import {
  isRestaurantCatalog,
  type TemplateSettings,
} from "@/lib/catalog/template-settings";
import { planStats } from "@/lib/catalog/floor-plan";
import { dashKicker } from "@/components/admin/dashboard/styles";

export function FloorPlanCard({
  catalogId,
  template,
  fulfillmentModes,
  settings,
}: {
  catalogId: string;
  template: CatalogTemplateKey;
  fulfillmentModes: OrderFulfillment[];
  settings: TemplateSettings;
}) {
  const restaurantish =
    isRestaurantCatalog(template, fulfillmentModes) ||
    settings.restaurant.enableReserve ||
    fulfillmentModes.includes("dine_in");
  const stats = planStats({ floors: settings.floor.floors });
  const hasPlan = stats.tables > 0 || settings.floor.floors.some((f) => f.tiles.length > 0);
  const empty = !hasPlan;

  return (
    <section id="floor" className="flex flex-wrap items-center gap-3 rounded-[16px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,32,0.04)] sm:px-[18px]">
      <div className="min-w-0 flex-1 basis-[240px]">
        <p className={`m-0 ${dashKicker}`}>Floor</p>
        {empty ? (
          <p className="m-0 mt-1 text-[14px] text-[#5a6472]">
            {restaurantish
              ? "Draw tables so guests can reserve or dine in."
              : "Optional floor plan for rooms and tables."}
          </p>
        ) : (
          <p className="m-0 mt-1 text-[15px] font-semibold tracking-tight tabular-nums">
            {stats.tables} {stats.tables === 1 ? "table" : "tables"} · {stats.covers} covers
          </p>
        )}
      </div>
      <Link href={`/admin/${catalogId}/floor`} className="ops-press text-[13px] text-[#0b5fce] no-underline">
        {empty ? "Open studio" : "Edit"}
      </Link>
    </section>
  );
}
