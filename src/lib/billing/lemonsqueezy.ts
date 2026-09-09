import "server-only";
import { getLemonSqueezyConfig } from "./config";

export async function createLemonCheckout(input: {
  accountId: string;
  email?: string;
  redirectUrl: string;
}): Promise<{ url: string } | { error: string }> {
  const config = getLemonSqueezyConfig();
  if (!config) {
    return { error: "Billing isn't configured." };
  }

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            ...(input.email ? { email: input.email } : {}),
            custom: {
              account_id: input.accountId,
            },
          },
          product_options: {
            enabled_variants: [Number(config.variantId) || config.variantId],
            redirect_url: input.redirectUrl,
            receipt_button_text: "Back to Instant Catalog",
          },
        },
        relationships: {
          store: { data: { type: "stores", id: String(config.storeId) } },
          variant: { data: { type: "variants", id: String(config.variantId) } },
        },
      },
    }),
  });

  const body = (await response.json()) as {
    data?: { attributes?: { url?: string } };
    errors?: { detail?: string }[];
  };

  const url = body.data?.attributes?.url;
  if (!response.ok || !url) {
    const detail = body.errors?.[0]?.detail;
    console.error("Lemon Squeezy checkout failed", response.status, detail ?? body);
    return { error: detail || "Could not start checkout. Try again." };
  }

  return { url };
}
