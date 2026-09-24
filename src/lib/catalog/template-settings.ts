import type { CatalogTemplateKey } from "./types";
import type { OrderFulfillment } from "@/lib/supabase/types";
import { parseCoord } from "./locations";
import { DEFAULT_VENUE_RADIUS_M } from "./dine-in-presence";
import {
  emptyPlan,
  flattenGuestTables,
  normalizePlan,
  planFromLegacyTables,
  type GuestFloorTable,
  type StudioFloor,
  type StudioPlan,
  type StudioTableShape,
} from "./floor-plan";

export type DietFilterDef = { id: string; label: string; keywords: string[] };
export type SortOptionId = "menu" | "price" | "name";
export type MenuSectionStyle = "cards" | "rows";

export type GridTemplateSettings = {
  columns: 2 | 3 | 4;
  showCodes: boolean;
  qtySteppers: boolean;
};

export type MenuTemplateSettings = {
  showPhotos: boolean;
  sectionStyle: MenuSectionStyle;
  dietFilters: boolean;
  dietOptions: DietFilterDef[];
  sorts: boolean;
  sortOptions: SortOptionId[];
  featuredTitle: string;
  featuredNote: string;
};

export type LookbookTemplateSettings = {
  showPrices: boolean;
  showDescriptions: boolean;
};

export type CardsTemplateSettings = {
  showDescription: boolean;
  showCodes: boolean;
};

export type CompactTemplateSettings = {
  showCodes: boolean;
  qtySteppers: boolean;
};

export type SpotlightTemplateSettings = {
  showHero: boolean;
  showCodes: boolean;
};

export type PriceListTemplateSettings = {
  showCodes: boolean;
  compactRows: boolean;
};

export type NotifySoundSettings = {
  enabled: boolean;
  catalog: boolean;
  dine_in: boolean;
  pickup: boolean;
  delivery: boolean;
  /** Extra addresses (comma-separated) that receive this catalog’s order emails. */
  emailCc: string;
};

export type RestaurantSettings = {
  defaultMode: OrderFulfillment | "";
  deliveryFee: number;
  minOrder: number;
  servicePercent: number;
  pickupReadyCopy: string;
  kitchenOpen: boolean;
  closedBanner: string;
  reopenCopy: string;
  scheduleWhenClosed: boolean;
  enableReserve: boolean;
  /** Draw rooms and tables. Independent of reservations. */
  enableFloor: boolean;
  holdPolicy: string;
  guestMin: number;
  guestMax: number;
  timeSlots: string[];
  dayCount: number;
  dineInQr: boolean;
  callWaiter: boolean;
  requestBill: boolean;
  kitchenRounds: boolean;
  orderCta: string;
  kitchenCta: string;
  enableClaim: boolean;
  /** When on, dine-in with a table skips name / phone / address. */
  skipDineInDetails: boolean;
  /** When on, guests without a table QR must say if they are already at the venue. */
  requireInRestaurantCheck: boolean;
  /** When on, /dine does not advertise pickup, delivery, or the public menu. */
  hideTakeawayOnDine: boolean;
  venueLat: number | null;
  venueLng: number | null;
  venueRadiusM: number;
};

export type FloorTable = {
  id: string;
  no: string;
  seats: number;
  bookable: boolean;
  status: "open" | "out";
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  shape?: StudioTableShape;
  floorId?: string;
};

export type FloorPlan = {
  name: string;
  tables: FloorTable[];
  /** Full studio model. Source of truth when present; `tables` is the guest flatten. */
  floors: StudioFloor[];
};

export type { GuestFloorTable, StudioFloor, StudioPlan, StudioTableShape };

export type TemplateSettings = {
  grid: GridTemplateSettings;
  menu: MenuTemplateSettings;
  lookbook: LookbookTemplateSettings;
  cards: CardsTemplateSettings;
  compact: CompactTemplateSettings;
  spotlight: SpotlightTemplateSettings;
  pricelist: PriceListTemplateSettings;
  restaurant: RestaurantSettings;
  notify: NotifySoundSettings;
  floor: FloorPlan;
  /** Staff-authored kitchen ticket HTML. Empty uses the default receipt. */
  printTicketHtml: string;
};

const DEFAULT_DIETS: DietFilterDef[] = [
  { id: "veg", label: "Vegetarian", keywords: ["veg", "vegetarian", "salad"] },
  { id: "vegan", label: "Vegan", keywords: ["vegan"] },
  { id: "spicy", label: "Spicy", keywords: ["spicy", "chili", "chilli", "hot"] },
];

const DEFAULT_SLOTS = ["12:00", "12:30", "13:00", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  grid: { columns: 4, showCodes: true, qtySteppers: true },
  menu: {
    showPhotos: true,
    sectionStyle: "cards",
    dietFilters: true,
    dietOptions: DEFAULT_DIETS,
    sorts: true,
    sortOptions: ["menu", "price", "name"],
    featuredTitle: "Featured today",
    featuredNote: "Highlights from the list",
  },
  lookbook: { showPrices: true, showDescriptions: true },
  cards: { showDescription: true, showCodes: false },
  compact: { showCodes: true, qtySteppers: true },
  spotlight: { showHero: true, showCodes: false },
  pricelist: { showCodes: true, compactRows: false },
  restaurant: {
    defaultMode: "",
    deliveryFee: 0,
    minOrder: 0,
    servicePercent: 0,
    pickupReadyCopy: "Pickup ready in 20 minutes",
    kitchenOpen: true,
    closedBanner: "Closed right now",
    reopenCopy: "",
    scheduleWhenClosed: true,
    enableReserve: true,
    enableFloor: false,
    holdPolicy: "We hold the table for 20 minutes past your time. Free to cancel by phone.",
    guestMin: 1,
    guestMax: 12,
    timeSlots: DEFAULT_SLOTS,
    dayCount: 4,
    dineInQr: true,
    callWaiter: false,
    requestBill: false,
    kitchenRounds: false,
    orderCta: "Place order",
    kitchenCta: "Send to kitchen",
    enableClaim: true,
    skipDineInDetails: true,
    requireInRestaurantCheck: true,
    hideTakeawayOnDine: false,
    venueLat: null,
    venueLng: null,
    venueRadiusM: DEFAULT_VENUE_RADIUS_M,
  },
  notify: {
    enabled: true,
    catalog: true,
    dine_in: true,
    pickup: true,
    delivery: true,
    emailCc: "",
  },
  floor: {
    name: "Ground floor",
    tables: [],
    floors: emptyPlan("Ground floor").floors,
  },
  printTicketHtml: "",
};

function asObj(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNum(value: unknown, fallback: number, min = 0, max = 1_000_000): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function asStr(value: unknown, fallback: string, max = 240): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function asPrintHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, 40_000);
}

function asMode(value: unknown): OrderFulfillment | "" {
  return value === "dine_in" || value === "pickup" || value === "delivery" ? value : "";
}

function asVenueCoord(value: unknown, maxAbs: number): number | null {
  const n = parseCoord(value);
  if (n == null || Math.abs(n) > maxAbs) return null;
  return n;
}

function asColumns(value: unknown): 2 | 3 | 4 {
  return value === 2 || value === 3 || value === 4 ? value : 4;
}

function asDiets(raw: unknown): DietFilterDef[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_DIETS;
  const out: DietFilterDef[] = [];
  for (const row of raw) {
    const obj = asObj(row);
    const id = asStr(obj.id, "").replace(/\s+/g, "_").slice(0, 32);
    const label = asStr(obj.label, "");
    if (!id || !label) continue;
    const keywords = Array.isArray(obj.keywords)
      ? obj.keywords.filter((k): k is string => typeof k === "string").map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [label.toLowerCase()];
    out.push({ id, label, keywords: keywords.length > 0 ? keywords : [label.toLowerCase()] });
  }
  return out.length > 0 ? out : DEFAULT_DIETS;
}

function asSorts(raw: unknown): SortOptionId[] {
  if (!Array.isArray(raw) || raw.length === 0) return ["menu", "price", "name"];
  const allowed = new Set<SortOptionId>(["menu", "price", "name"]);
  const next = raw.filter((v): v is SortOptionId => typeof v === "string" && allowed.has(v as SortOptionId));
  return next.length > 0 ? next : ["menu", "price", "name"];
}

function asSlots(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_SLOTS;
  const next = raw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, 16))
    .filter(Boolean);
  return next.length > 0 ? next : DEFAULT_SLOTS;
}

function asTables(raw: unknown): FloorTable[] {
  if (!Array.isArray(raw)) return [];
  const tables: FloorTable[] = [];
  for (const row of raw) {
    const obj = asObj(row);
    const id = asStr(obj.id, "").slice(0, 40);
    const no = asStr(obj.no, "").slice(0, 16);
    if (!id || !no) continue;
    tables.push({
      id,
      no,
      seats: Math.max(1, Math.min(30, asNum(obj.seats, 4))),
      bookable: asBool(obj.bookable, obj.status !== "out" && obj.status !== "closed"),
      status: obj.status === "out" || obj.status === "closed" ? "out" : "open",
    });
  }
  return tables;
}

export function publishedFloorPlan(plan: unknown): FloorPlan {
  const next = normalizePlan(plan);
  const tables = flattenGuestTables(next);
  return {
    name: next.floors[0]?.name || "Ground floor",
    tables,
    floors: next.floors,
  };
}

function asFloorPlan(raw: unknown): FloorPlan {
  const obj = asObj(raw);
  const name = asStr(obj.name, "Ground floor", 80);
  if (Array.isArray(obj.floors) && obj.floors.length > 0) {
    return publishedFloorPlan(obj);
  }
  const legacy = asTables(obj.tables);
  if (legacy.length > 0) {
    return publishedFloorPlan(planFromLegacyTables(name, legacy));
  }
  return publishedFloorPlan(emptyPlan(name));
}

export function floorPlanHasContent(floor: FloorPlan): boolean {
  if (floor.tables.length > 0) return true;
  // Default studio floors ship a blank tile rectangle. Tiles alone are not a plan.
  return floor.floors.some((f) => f.tables.length > 0 || f.items.length > 0);
}

function asEnableFloor(raw: unknown, floor: FloorPlan): boolean {
  if (typeof raw === "boolean") return raw;
  // Legacy catalogs that already drew rooms keep the studio. Reservations alone do not.
  return floorPlanHasContent(floor);
}

/** Restaurant Menu may include a floor. Retail / grid / cafe-style looks do not offer one. */
export function templateOffersFloor(template: CatalogTemplateKey): boolean {
  return template === "menu";
}

export function isFloorPlanEnabled(settings: TemplateSettings): boolean {
  return settings.restaurant.enableFloor;
}

/** Settings row: menu templates, or a catalog that already opted in. */
export function catalogOffersFloorSettings(
  template: CatalogTemplateKey,
  settings: TemplateSettings,
): boolean {
  return templateOffersFloor(template) || settings.restaurant.enableFloor;
}

export function parseTemplateSettings(raw: unknown): TemplateSettings {
  const root = asObj(raw);
  const grid = asObj(root.grid);
  const menu = asObj(root.menu);
  const lookbook = asObj(root.lookbook);
  const cards = asObj(root.cards);
  const compact = asObj(root.compact);
  const spotlight = asObj(root.spotlight);
  const pricelist = asObj(root.pricelist);
  const restaurant = asObj(root.restaurant);
  const notify = asObj(root.notify);
  const floor = asFloorPlan(root.floor);
  const d = DEFAULT_TEMPLATE_SETTINGS;

  return {
    grid: {
      columns: asColumns(grid.columns),
      showCodes: asBool(grid.showCodes, d.grid.showCodes),
      qtySteppers: asBool(grid.qtySteppers, d.grid.qtySteppers),
    },
    menu: {
      showPhotos: asBool(menu.showPhotos, d.menu.showPhotos),
      sectionStyle: menu.sectionStyle === "rows" ? "rows" : "cards",
      dietFilters: asBool(menu.dietFilters, d.menu.dietFilters),
      dietOptions: asDiets(menu.dietOptions),
      sorts: asBool(menu.sorts, d.menu.sorts),
      sortOptions: asSorts(menu.sortOptions),
      featuredTitle: asStr(menu.featuredTitle, d.menu.featuredTitle, 80),
      featuredNote: asStr(menu.featuredNote, d.menu.featuredNote, 120),
    },
    lookbook: {
      showPrices: asBool(lookbook.showPrices, d.lookbook.showPrices),
      showDescriptions: asBool(lookbook.showDescriptions, d.lookbook.showDescriptions),
    },
    cards: {
      showDescription: asBool(cards.showDescription, d.cards.showDescription),
      showCodes: asBool(cards.showCodes, d.cards.showCodes),
    },
    compact: {
      showCodes: asBool(compact.showCodes, d.compact.showCodes),
      qtySteppers: asBool(compact.qtySteppers, d.compact.qtySteppers),
    },
    spotlight: {
      showHero: asBool(spotlight.showHero, d.spotlight.showHero),
      showCodes: asBool(spotlight.showCodes, d.spotlight.showCodes),
    },
    pricelist: {
      showCodes: asBool(pricelist.showCodes, d.pricelist.showCodes),
      compactRows: asBool(pricelist.compactRows, d.pricelist.compactRows),
    },
    restaurant: {
      defaultMode: asMode(restaurant.defaultMode),
      deliveryFee: asNum(restaurant.deliveryFee, 0, 0, 10_000),
      minOrder: asNum(restaurant.minOrder, 0, 0, 10_000),
      servicePercent: asNum(restaurant.servicePercent, 0, 0, 40),
      pickupReadyCopy: asStr(restaurant.pickupReadyCopy, d.restaurant.pickupReadyCopy),
      kitchenOpen: asBool(restaurant.kitchenOpen, true),
      closedBanner: asStr(restaurant.closedBanner, d.restaurant.closedBanner),
      reopenCopy: asStr(restaurant.reopenCopy, ""),
      scheduleWhenClosed: asBool(restaurant.scheduleWhenClosed, true),
      enableReserve: asBool(restaurant.enableReserve, true),
      enableFloor: asEnableFloor(restaurant.enableFloor, floor),
      holdPolicy: asStr(restaurant.holdPolicy, d.restaurant.holdPolicy, 280),
      guestMin: asNum(restaurant.guestMin, 1, 1, 20),
      guestMax: asNum(restaurant.guestMax, 12, 1, 40),
      timeSlots: asSlots(restaurant.timeSlots),
      dayCount: asNum(restaurant.dayCount, 4, 1, 14),
      dineInQr: asBool(restaurant.dineInQr, true),
      callWaiter: asBool(restaurant.callWaiter, false),
      requestBill: asBool(restaurant.requestBill, false),
      kitchenRounds: asBool(restaurant.kitchenRounds, false),
      orderCta: asStr(restaurant.orderCta, d.restaurant.orderCta, 40),
      kitchenCta: asStr(restaurant.kitchenCta, d.restaurant.kitchenCta, 40),
      enableClaim: asBool(restaurant.enableClaim, true),
      skipDineInDetails: asBool(restaurant.skipDineInDetails, true),
      requireInRestaurantCheck: asBool(restaurant.requireInRestaurantCheck, true),
      hideTakeawayOnDine: asBool(restaurant.hideTakeawayOnDine, false),
      venueLat: asVenueCoord(restaurant.venueLat, 90),
      venueLng: asVenueCoord(restaurant.venueLng, 180),
      venueRadiusM: asNum(restaurant.venueRadiusM, DEFAULT_VENUE_RADIUS_M, 50, 5_000),
    },
    notify: {
      enabled: asBool(notify.enabled, true),
      catalog: asBool(notify.catalog, true),
      dine_in: asBool(notify.dine_in, true),
      pickup: asBool(notify.pickup, true),
      delivery: asBool(notify.delivery, true),
      emailCc: asStr(notify.emailCc, "", 400),
    },
    floor,
    printTicketHtml: asPrintHtml(root.printTicketHtml),
  };
}

export function parseTemplateSettingsFromForm(raw: FormDataEntryValue | null): TemplateSettings {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_TEMPLATE_SETTINGS;
  try {
    return parseTemplateSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_TEMPLATE_SETTINGS;
  }
}

/** Restaurant chrome when Menu is picked or any fulfillment mode is on. */
export function isRestaurantCatalog(
  template: CatalogTemplateKey,
  fulfillmentModes: OrderFulfillment[],
): boolean {
  return template === "menu" || fulfillmentModes.length > 0;
}

export function resolvedDefaultMode(
  modes: OrderFulfillment[],
  preferred: OrderFulfillment | "",
): OrderFulfillment | null {
  if (modes.length === 0) return null;
  if (preferred && modes.includes(preferred)) return preferred;
  return modes[0] ?? null;
}

export function isDineInTableSession(args: {
  dineInQr: boolean;
  tableNo?: string | null;
  fulfillment: OrderFulfillment | null;
}): boolean {
  return args.dineInQr && Boolean(args.tableNo) && args.fulfillment === "dine_in";
}

export function orderCtaLabel(
  settings: TemplateSettings,
  fulfillment: OrderFulfillment | null,
): string {
  if (fulfillment === "dine_in" && settings.restaurant.kitchenCta) {
    return settings.restaurant.kitchenCta;
  }
  return settings.restaurant.orderCta || DEFAULT_TEMPLATE_SETTINGS.restaurant.orderCta;
}

export const TEMPLATE_SETTINGS_SQL_HINT =
  "Run supabase/template-settings.sql in the Supabase SQL editor, then try again.";

export const SERVICE_REQUESTS_SQL_HINT = TEMPLATE_SETTINGS_SQL_HINT;

export const ORDER_CLAIMS_SQL_HINT =
  "Run supabase/order-claims.sql in the Supabase SQL editor, then try again.";

export function parseNotifyEmails(value: unknown): string[] {
  const raw = typeof value === "string" ? value : "";
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part));
}
