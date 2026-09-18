import { DEFAULT_CHECKOUT_FIELDS } from "./checkout-fields";
import { resolveCheckoutForm, restaurantPresetFields } from "./checkout-form";
import { STOCK_PHOTOS } from "./placeholders";
import type { CatalogTemplateKey, StorefrontCatalog, StorefrontItem } from "./types";
import type { ItemOptionGroup } from "@/lib/supabase/types";
import { DEFAULT_TEMPLATE_SETTINGS, publishedFloorPlan } from "./template-settings";
import { emptyPlan, planFromLegacyTables } from "./floor-plan";

const PREVIEW_CATALOG_ID = "builder-look-preview";

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

function previewItem(
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

/** Fixed dummy catalog for the builder Look preview — items are added after publish. */
export function buildLookPreviewCatalog(input: {
  name: string;
  template: CatalogTemplateKey;
  accent: string;
  currency: string;
}): StorefrontCatalog {
  const salad = stock("salad");
  const pizza = stock("pizza");
  const coffee = stock("coffee");
  const drink = stock("drink");
  const bowl = stock("bowl");
  const bakery = stock("bakery");
  const plated = stock("plated");

  const items: StorefrontItem[] = [
    previewItem({
      id: "preview-salad",
      code: "SALAD",
      category: "Mains",
      name: "Garden salad",
      description: "Greens, citrus, and toasted seeds.",
      price: 8.5,
      image: salad,
    }),
    previewItem({
      id: "preview-pizza",
      code: "PIZZA",
      category: "Mains",
      name: "Margherita pizza",
      description: "Tomato, mozzarella, basil.",
      price: 14,
      image: pizza,
      featured: true,
      options: sizeChips(["S", "M", "L"]),
    }),
    previewItem({
      id: "preview-bowl",
      code: "BOWL",
      category: "Mains",
      name: "Harvest bowl",
      description: "Grains, roast veg, tahini.",
      price: 12.5,
      image: bowl,
      options: sizeChips(["Regular", "Large"]),
    }),
    previewItem({
      id: "preview-coffee",
      code: "COFFEE",
      category: "Drinks",
      name: "House coffee",
      description: "Batch brew, rotating origin.",
      price: 4,
      image: coffee,
    }),
    previewItem({
      id: "preview-spritz",
      code: "SPRITZ",
      category: "Drinks",
      name: "Citrus spritz",
      description: "Orange, soda, mint.",
      price: 5.5,
      image: drink,
    }),
    previewItem({
      id: "preview-loaf",
      code: "LOAF",
      category: "Bakery",
      name: "Sourdough loaf",
      description: "Baked this morning.",
      price: 6,
      image: bakery,
    }),
    previewItem({
      id: "preview-combo",
      code: "COMBO",
      category: "Combos",
      name: "Lunch combo",
      description: "Salad and coffee, one price.",
      price: 11.5,
      image: plated,
      isCombo: true,
      comboIncludes: [
        { id: "preview-salad", name: "Garden salad", qty: 1, image: salad },
        { id: "preview-coffee", name: "House coffee", qty: 1, image: coffee },
      ],
    }),
  ];

  const restaurant = input.template === "menu";
  const checkoutFields = DEFAULT_CHECKOUT_FIELDS;
  const checkoutForm = restaurant
    ? restaurantPresetFields()
    : resolveCheckoutForm(null, checkoutFields);

  return {
    id: PREVIEW_CATALOG_ID,
    name: input.name.trim() || (restaurant ? "Sample kitchen" : "Sample shop"),
    slug: "sample-shop",
    template: input.template,
    accent: input.accent,
    currency: input.currency,
    checkoutFields,
    checkoutForm,
    fulfillmentModes: restaurant ? ["delivery", "pickup", "dine_in"] : [],
    settings: {
      ...DEFAULT_TEMPLATE_SETTINGS,
      restaurant: {
        ...DEFAULT_TEMPLATE_SETTINGS.restaurant,
        deliveryFee: restaurant ? 8 : 0,
        minOrder: restaurant ? 25 : 0,
        kitchenOpen: true,
      },
      floor: publishedFloorPlan(
        restaurant
          ? planFromLegacyTables("Main floor", [
              { id: "t1", no: "1", seats: 4, bookable: true, status: "open" },
              { id: "t2", no: "2", seats: 4, bookable: true, status: "open" },
              { id: "t3", no: "3", seats: 2, bookable: true, status: "open" },
              { id: "t4", no: "4", seats: 6, bookable: true, status: "open" },
            ])
          : emptyPlan("Main floor"),
      ),
    },
    logo: "",
    tagline: restaurant ? "Kitchen · sample preview" : "Sample menu",
    about: "",
    banners: [],
    imageFit: "cover",
    phone: "+1 555 0100",
    email: "hello@sampleshop.test",
    address: "12 Market Street",
    hours: "Mon–Sat 9:00–18:00\nSunday closed",
    whatsapp: "",
    instagram: "",
    acceptOrders: true,
    ordersPausedMessage: "We are not taking orders right now.",
    storefrontAlert: "",
    showStorefrontAlert: false,
    showMap: false,
    showHours: true,
    showContact: true,
    showSocial: false,
    locations: [],
    geoLat: null,
    geoLng: null,
    placeholderImage: "",
    usedPlaceholderImages: true,
    items,
  };
}
