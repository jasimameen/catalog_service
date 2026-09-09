import type { ComponentType } from "react";
import type { StorefrontCatalog } from "@/lib/catalog/types";
import { GridTemplate } from "./Grid";
import { LookbookTemplate } from "./Lookbook";
import { MenuTemplate } from "./Menu";
import { PriceListTemplate } from "./PriceList";
import { CardsTemplate } from "./Cards";
import { CompactTemplate } from "./Compact";
import { SpotlightTemplate } from "./Spotlight";

export interface TemplateProps {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}

export const TEMPLATE_COMPONENTS: Record<StorefrontCatalog["template"], ComponentType<TemplateProps>> = {
  grid: GridTemplate,
  lookbook: LookbookTemplate,
  menu: MenuTemplate,
  pricelist: PriceListTemplate,
  cards: CardsTemplate,
  compact: CompactTemplate,
  spotlight: SpotlightTemplate,
};
