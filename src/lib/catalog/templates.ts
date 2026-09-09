import type { CatalogTemplateKey } from "./types";

export interface TemplateMeta {
  key: CatalogTemplateKey;
  name: string;
  blurb: string;
  /** Longer "best for…" copy used on the public /templates gallery. */
  longBlurb: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    key: "grid",
    name: "Trade Grid",
    blurb: "Dense grid with item codes and quantity steppers.",
    longBlurb:
      "The layout your catalogue uses today: a dense photo grid with item codes, quick " +
      "multiples and an inline cart. Best when a customer knows what they need and orders by code.",
  },
  {
    key: "lookbook",
    name: "Lookbook",
    blurb: "Large photos, generous spacing, few items.",
    longBlurb:
      "Large imagery and editorial spacing for a short, considered list. Best for seasonal " +
      "selections, hospitality lists or anything sold on how it looks.",
  },
  {
    key: "menu",
    name: "Menu",
    blurb: "Sectioned list, photos optional.",
    longBlurb:
      "A sectioned list with no photos required. Best for kitchens, services and weekly " +
      "supply lists where the names carry the order.",
  },
  {
    key: "pricelist",
    name: "Price List",
    blurb: "Table that prints and exports cleanly.",
    longBlurb:
      "A table built for print and PDF export. Best for trade pricing sent by email or " +
      "handed to a buyer on paper.",
  },
];

export const ACCENT_COLORS = ["#0b5fce", "#1d1d1f", "#0f7b53", "#b2432b"];

export function templateMeta(key: CatalogTemplateKey): TemplateMeta {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
}
