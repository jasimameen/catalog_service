import type { ComponentType, ReactNode } from "react";
import type { StorefrontCatalog } from "@/lib/catalog/types";
import type { OrderResult } from "@/lib/catalog/order-types";
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
  onPlaced?: (result: OrderResult) => void;
  filters?: ReactNode;
  featured?: ReactNode;
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
