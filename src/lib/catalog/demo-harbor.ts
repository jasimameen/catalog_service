import { DEFAULT_CHECKOUT_FIELDS } from "./checkout-fields";
import { restaurantPresetFields } from "./checkout-form";
import { STOCK_PHOTOS } from "./placeholders";
import type { StorefrontCatalog, StorefrontItem } from "./types";
import type { ItemOptionGroup } from "@/lib/supabase/types";
import { DEFAULT_TEMPLATE_SETTINGS, publishedFloorPlan } from "./template-settings";
import { planFromLegacyTables } from "./floor-plan";

/** In-memory marketing fallback. Real live demo is slug `harbor` in the DB. */
export const HARBOR_DEMO_SLUG = "harbor";
export const HARBOR_DEMO_NAME = "Harbor Kitchen";
export const HARBOR_PREVIEW_ID = "builder-harbor-kitchen";
export const HARBOR_LIVE_PATH = "/live";

/** 184 Atlantic Avenue, Brooklyn, NY 11201 — dummy US venue for dine-in nearby. */
export const HARBOR_ADDRESS = "184 Atlantic Avenue, Brooklyn, NY 11201";
export const HARBOR_PHONE = "(718) 555-0184";
export const HARBOR_WHATSAPP = "+17185550184";
export const HARBOR_INSTAGRAM = "harborkitchen";
export const HARBOR_FACEBOOK = "facebook.com/harborkitchen";
export const HARBOR_LAT = 40.6891;
export const HARBOR_LNG = -73.9956;

function stock(id: string): string {
  return STOCK_PHOTOS.find((photo) => photo.id === id)?.url ?? STOCK_PHOTOS[0]!.url;
}

function sizeChips(names: string[]): ItemOptionGroup[] {
  return [
    {
      name: "Size",
      type: "single",
      required: true,
      values: names.map((name) => ({ name, price_delta: 0 })),
    },
  ];
}

function item(
  partial: Omit<StorefrontItem, "pack" | "available" | "imageFit" | "options" | "featured" | "isCombo" | "comboIncludes"> &
    Partial<Pick<StorefrontItem, "pack" | "available" | "imageFit" | "options" | "featured" | "isCombo" | "comboIncludes">>,
): StorefrontItem {
  return {
    pack: "",
    available: true,
    imageFit: "cover",
    options: [],
    featured: false,
    isCombo: false,
    comboIncludes: [],
    ...partial,
  };
}

export const HARBOR_HOURS_TEXT = [
  "Tuesday–Thursday",
  "11:00 AM – 10:00 PM",
  "",
  "Friday–Saturday",
  "11:00 AM – 11:00 PM",
  "",
  "Sunday",
  "11:00 AM – 9:00 PM",
  "",
  "Monday",
  "Closed",
].join("\n");

/** Generic US restaurant catalog — Instant Catalog demo. Not Tea Day. */
export function buildHarborKitchenCatalog(): StorefrontCatalog {
  const salad = stock("salad");
  const pizza = stock("pizza");
  const coffee = stock("coffee");
  const drink = stock("drink");
  const bowl = stock("bowl");
  const bakery = stock("bakery");
  const plated = stock("plated");

  const items: StorefrontItem[] = [
    item({
      id: "harbor-catch",
      code: "CATCH",
      category: "Mains",
      name: "Grilled catch",
      description: "Day-boat fish, lemon, olive oil, herbs.",
      price: 32,
      image: plated,
      featured: true,
    }),
    item({
      id: "harbor-salad",
      code: "SALAD",
      category: "Mains",
      name: "Harbor salad",
      description: "Greens, citrus, toasted seeds.",
      price: 16,
      image: salad,
      featured: true,
    }),
    item({
      id: "harbor-chowder",
      code: "CHOWDER",
      category: "Mains",
      name: "Harbor chowder",
      description: "Cream, potato, smoked fish.",
      price: 14,
      image: bowl,
    }),
    item({
      id: "harbor-chicken",
      code: "CHICKEN",
      category: "Mains",
      name: "Roast chicken",
      description: "Half bird, pan juices, seasonal greens.",
      price: 26,
      image: pizza,
      options: sizeChips(["Half", "Whole"]),
    }),
    item({
      id: "harbor-fries",
      code: "FRIES",
      category: "Sides",
      name: "Herb fries",
      description: "Crisp, rosemary salt.",
      price: 8,
      image: plated,
    }),
    item({
      id: "harbor-greens",
      code: "GREENS",
      category: "Sides",
      name: "Seasonal greens",
      description: "Olive oil, lemon.",
      price: 9,
      image: salad,
    }),
    item({
      id: "harbor-lemonade",
      code: "LEMONADE",
      category: "Drinks",
      name: "House lemonade",
      description: "Fresh lemon, mint.",
      price: 5,
      image: drink,
    }),
    item({
      id: "harbor-espresso",
      code: "ESPRESSO",
      category: "Drinks",
      name: "Espresso",
      description: "Short, rotating origin.",
      price: 4,
      image: coffee,
    }),
    item({
      id: "harbor-bread",
      code: "BREAD",
      category: "Bakery",
      name: "Olive focaccia",
      description: "Baked this morning.",
      price: 7,
      image: bakery,
    }),
    item({
      id: "harbor-lunch",
      code: "LUNCH",
      category: "Combos",
      name: "Lunch plate",
      description: "Salad and lemonade, one price.",
      price: 19,
      image: bowl,
      isCombo: true,
      comboIncludes: [
        { id: "harbor-salad", name: "Harbor salad", qty: 1, image: salad },
        { id: "harbor-lemonade", name: "House lemonade", qty: 1, image: drink },
      ],
    }),
  ];

  return {
    id: HARBOR_PREVIEW_ID,
    name: HARBOR_DEMO_NAME,
    slug: HARBOR_DEMO_SLUG,
    template: "menu",
    accent: "#0b5fce",
    currency: "USD",
    checkoutFields: DEFAULT_CHECKOUT_FIELDS,
    checkoutForm: restaurantPresetFields(),
    fulfillmentModes: ["dine_in", "pickup", "delivery"],
    settings: {
      ...DEFAULT_TEMPLATE_SETTINGS,
      restaurant: {
        ...DEFAULT_TEMPLATE_SETTINGS.restaurant,
        dineInQr: true,
        callWaiter: true,
        requestBill: true,
        kitchenRounds: true,
        enableReserve: true,
        enableFloor: true,
        skipDineInDetails: true,
        requireInRestaurantCheck: true,
        kitchenOpen: true,
        holdPolicy: "We hold the table for 20 minutes past your time. Free to cancel by phone.",
        pickupReadyCopy: "Pickup ready in 20 minutes",
        venueLat: HARBOR_LAT,
        venueLng: HARBOR_LNG,
        venueRadiusM: 200,
      },
      floor: publishedFloorPlan(
        planFromLegacyTables("Ground floor", [
          { id: "h1", no: "1", seats: 2, bookable: true, status: "open" },
          { id: "h2", no: "2", seats: 4, bookable: true, status: "open" },
          { id: "h3", no: "3", seats: 4, bookable: true, status: "open" },
          { id: "h4", no: "4", seats: 4, bookable: true, status: "open" },
          { id: "h5", no: "5", seats: 6, bookable: true, status: "open" },
          { id: "h6", no: "6", seats: 2, bookable: true, status: "open" },
        ]),
      ),
    },
    logo: "",
    tagline: "Cobble Hill · Brooklyn",
    about:
      "A sample Brooklyn restaurant for Instant Catalog. Dine-in QR, pickup, delivery, and table reserve. Instagram @harborkitchen · facebook.com/harborkitchen",
    banners: [],
    imageFit: "cover",
    phone: HARBOR_PHONE,
    email: "",
    address: HARBOR_ADDRESS,
    hours: HARBOR_HOURS_TEXT,
    whatsapp: HARBOR_WHATSAPP,
    instagram: HARBOR_INSTAGRAM,
    acceptOrders: true,
    ordersPausedMessage: "We are not taking orders right now.",
    storefrontAlert: "",
    showStorefrontAlert: false,
    showMap: true,
    showHours: true,
    showContact: true,
    showSocial: true,
    locations: [],
    geoLat: HARBOR_LAT,
    geoLng: HARBOR_LNG,
    placeholderImage: "",
    usedPlaceholderImages: true,
    items,
  };
}
