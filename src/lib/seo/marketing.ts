import type { Metadata } from "next";
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_USD, TRIAL_DAYS } from "@/lib/billing/plan";
import {
  COMPANY_NAME,
  COMPANY_URL,
  CONTACT_EMAIL,
  CONTACT_WHATSAPP_DISPLAY,
  CONTACT_WHATSAPP_E164,
  CONTACT_WHATSAPP_HREF,
  PRODUCT_DOMAIN,
  PRODUCT_URL,
} from "@/lib/brand";

/** Public product name for search and answer engines. UI chrome can stay “HV Catalog”. */
export const SEO_PRODUCT = "Instant Catalog";
export const SEO_ENTITY = `${SEO_PRODUCT} by ${COMPANY_NAME}`;

export const HOME_TITLE = `${SEO_PRODUCT} — restaurant QR menu and table reservations`;
export const HOME_DESCRIPTION = `A live catalog guests open on their phone. Restaurant QR menu, table reservations, pickup and delivery. ${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL}. Set it up yourself or we will.`;

export const LIVE_TITLE = `Harbor Kitchen — ${SEO_PRODUCT} restaurant demo`;
export const LIVE_DESCRIPTION =
  "A sample restaurant QR menu with dine-in, pickup, delivery, and table reservations. Demo of Instant Catalog by Hevyf — not a real restaurant.";

export const SETUP_TITLE = `We’ll set up your catalog — ${SEO_PRODUCT}`;
export const SETUP_DESCRIPTION = `Send your menu, logo, and how to reach you. We publish the live catalog, restaurant QR menu, and reservations dashboard. ${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL}.`;

export const SIGNUP_TITLE = `Start a free ${SEO_PRODUCT} — ${TRIAL_DAYS} days, no card`;
export const SIGNUP_DESCRIPTION = `Create a live catalog with restaurant QR menu and table reservations. ${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL}. Email sign-up.`;

export const TEMPLATES_TITLE = `Catalog templates — ${SEO_PRODUCT}`;
export const TEMPLATES_DESCRIPTION =
  "Restaurant menu, grid, lookbook, and price list layouts for the same Instant Catalog. Switch any time after you publish.";

export const WHAT_IS_INSTANT_CATALOG = `${SEO_PRODUCT} is a live catalog guests open on their phone. Restaurants use it as a QR menu with table reservations, pickup, and delivery. Shops use it as a product list. It is made by ${COMPANY_NAME}.`;

export const MARKETING_FAQS: { q: string; a: string }[] = [
  {
    q: "What is Instant Catalog?",
    a: WHAT_IS_INSTANT_CATALOG,
  },
  {
    q: "How much does Instant Catalog cost?",
    a: `${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL}. One live shop. Same price if you set it up or we do.`,
  },
  {
    q: "Is Instant Catalog restaurant QR menu software?",
    a: "Yes. A code on the table opens the live menu. Guests can send the order to the kitchen, call a waiter, and ask for the bill.",
  },
  {
    q: "Does Instant Catalog include table reservation software?",
    a: "Yes. Guests pick a day, a time, and a table. It lands in the same dashboard as orders. You can hide reserve in settings if you do not want it.",
  },
  {
    q: "Do you rank Instant Catalog in every city?",
    a: `No. We sell software, not local SEO. Contact is ${CONTACT_EMAIL} and WhatsApp ${CONTACT_WHATSAPP_DISPLAY}. The setup form asks for a country so we can reach you — we do not claim a shop in every city.`,
  },
];

export function absoluteUrl(path: string): string {
  if (!path || path === "/") return PRODUCT_URL;
  return `${PRODUCT_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function marketingMetadata(opts: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const index = opts.index !== false;
  return {
    title: opts.title,
    description: opts.description,
    applicationName: SEO_PRODUCT,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: "website",
      siteName: SEO_PRODUCT,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
    robots: { index, follow: index },
  };
}

export function marketingJsonLd(): Record<string, unknown> {
  const orgId = `${COMPANY_URL}#organization`;
  const appId = `${PRODUCT_URL}#software`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: COMPANY_NAME,
        url: COMPANY_URL,
        email: CONTACT_EMAIL,
        telephone: `+${CONTACT_WHATSAPP_E164}`,
        sameAs: [CONTACT_WHATSAPP_HREF],
        description: `${COMPANY_NAME} makes ${SEO_PRODUCT}, a live catalog for kitchens and shops.`,
      },
      {
        "@type": "SoftwareApplication",
        "@id": appId,
        name: SEO_PRODUCT,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: PRODUCT_URL,
        description: HOME_DESCRIPTION,
        brand: { "@id": orgId },
        creator: { "@id": orgId },
        offers: {
          "@type": "Offer",
          price: MONTHLY_PRICE_USD,
          priceCurrency: "USD",
          url: `${PRODUCT_URL}/#pricing`,
          description: `${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL}.`,
        },
        featureList: [
          "Live catalog on a link",
          "Restaurant QR menu / dine-in",
          "Table reservations",
          "Pickup and delivery orders",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${PRODUCT_URL}#website`,
        name: SEO_PRODUCT,
        url: PRODUCT_URL,
        description: HOME_DESCRIPTION,
        publisher: { "@id": orgId },
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${PRODUCT_URL}#faq`,
        mainEntity: MARKETING_FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };
}

export const LLMS_TXT = `# ${SEO_PRODUCT}

${WHAT_IS_INSTANT_CATALOG}

- Product: ${SEO_PRODUCT}
- Company: ${COMPANY_NAME} (${COMPANY_URL})
- Site: ${PRODUCT_URL}
- Contact: ${CONTACT_EMAIL}
- WhatsApp: ${CONTACT_WHATSAPP_DISPLAY} (${CONTACT_WHATSAPP_HREF})

## What it is
Live catalog on a phone. Restaurant QR menu, table reservations, pickup, delivery. Shops can use the same product as a price list.

## What it is not
Not a POS. Not a marketplace. Not a local SEO agency. We do not claim Instant Catalog ranks in every city. Harbor Kitchen on /live is a sample restaurant, not a real venue and not ${COMPANY_NAME}'s office.

## Price and doors
${TRIAL_DAYS} days free, then ${MONTHLY_PRICE_LABEL}. One live shop.
- Do it yourself: ${absoluteUrl("/auth/sign-up")}
- We’ll set it up: ${absoluteUrl("/setup")}

## Pages
- ${PRODUCT_URL} — product
- ${absoluteUrl("/live")} — Harbor Kitchen demo
- ${absoluteUrl("/setup")} — concierge setup
- ${absoluteUrl("/auth/sign-up")} — start free
- ${absoluteUrl("/templates")} — layouts

Host: ${PRODUCT_DOMAIN}
`;
