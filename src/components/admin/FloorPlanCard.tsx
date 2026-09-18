import Link from "next/link";
import type { CatalogTemplateKey } from "@/lib/catalog/types";
import type { OrderFulfillment } from "@/lib/supabase/types";
import {
  isRestaurantCatalog,
  type TemplateSettings,
} from "@/lib/catalog/template-settings";
import { planStats } from "@/lib/catalog/floor-plan";
import { dashBtnPrimary, dashCard, dashKicker } from "@/components/admin/dashboard/styles";

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
    <section id="floor" className={`${dashCard} flex flex-wrap items-center gap-3.5 px-4 py-4 sm:px-[18px]`}>
      <div className="min-w-0 flex-1 basis-[240px]">
        <p className={`m-0 ${dashKicker}`}>Floor plan</p>
        {empty ? (
          <>
            <p className="m-0 mt-1.5 text-[18px] font-semibold tracking-tight text-[var(--cat-ink)]">
              Design rooms and tables
            </p>
            <p className="m-0 mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">
              {restaurantish
                ? "Paint floors, drop tables, then publish. Guests pick from this plan when they reserve or dine in."
                : "Open the studio to draw a floor. Turn on dine-in or reserve in Ordering when you want guests to use it."}
            </p>
          </>
        ) : (
          <>
            <p className="m-0 mt-1.5 text-[22px] font-semibold tracking-tight text-[var(--cat-ink)] tabular-nums">
              {stats.floors} {stats.floors === 1 ? "floor" : "floors"} · {stats.tables}{" "}
              {stats.tables === 1 ? "table" : "tables"} · {stats.covers} covers
            </p>
            <p className="m-0 mt-1 text-[13px] text-[var(--cat-muted)]">
              {stats.area} m² painted · {settings.floor.name}
              {settings.restaurant.enableReserve ? " · live for reserve" : ""}
            </p>
          </>
        )}
      </div>
      <Link href={`/admin/${catalogId}/floor`} className={`${dashBtnPrimary} no-underline`}>
        Open studio
      </Link>
    </section>
  );
}
