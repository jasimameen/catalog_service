import "server-only";
import { getLemonSqueezyConfig } from "./config";

const LS_API = "https://api.lemonsqueezy.com/v1";

const RELATED_RESOURCE_HINT =
  "Lemon Squeezy couldn't find that store or variant. Check LEMONSQUEEZY_STORE_ID and LEMONSQUEEZY_VARIANT_ID — use the Variant ID (not the Product ID), and a Test API key only works with Test-mode variants.";

type LemonError = {
  detail?: string;
  status?: string;
  source?: { pointer?: string };
};

type LemonBody = {
  data?: { attributes?: { url?: string; store_id?: number } };
  errors?: LemonError[];
  included?: {
    type: string;
    id: string;
    attributes?: { status?: string; interval?: string | null };
  }[];
};

function lemonHeaders(apiKey: string) {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function parseLemonId(value: string): string | null {
  const id = value.trim().replace(/^["']|["']$/g, "");
  return /^\d+$/.test(id) ? id : null;
}

function userFacingLemonError(status: number, body: LemonBody): string {
  const detail = body.errors?.[0]?.detail ?? "";
  if (
    status === 404 ||
    status === 422 ||
    /related resource does not exist/i.test(detail)
  ) {
    return RELATED_RESOURCE_HINT;
  }
  return detail || "Could not start checkout. Try again.";
}

async function lsFetch(apiKey: string, path: string, init?: RequestInit) {
  return fetch(`${LS_API}${path}`, {
    ...init,
    headers: { ...lemonHeaders(apiKey), ...init?.headers },
  });
}

async function variantIdFromProduct(
  apiKey: string,
  productId: string,
  storeId: string
): Promise<string | null> {
  const res = await lsFetch(apiKey, `/products/${productId}?include=variants`);
  if (!res.ok) return null;

  const body = (await res.json()) as LemonBody;
  const productStore = body.data?.attributes?.store_id;
  if (productStore != null && String(productStore) !== storeId) {
    return null;
  }

  const variants = (body.included ?? []).filter((item) => item.type === "variants");
  const published = variants.filter((item) => item.attributes?.status === "published");
  const pool = published.length ? published : variants;
  const monthly = pool.find((item) => item.attributes?.interval === "month");
  return monthly?.id ?? pool[0]?.id ?? null;
}

function checkoutPayload(input: {
  storeId: string;
  variantId: string;
  accountId: string;
  email?: string;
  redirectUrl: string;
}) {
  return {
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
          enabled_variants: [Number(input.variantId)],
          redirect_url: input.redirectUrl,
          receipt_button_text: "Back to HV Catalog",
        },
      },
      relationships: {
        store: { data: { type: "stores", id: input.storeId } },
        variant: { data: { type: "variants", id: input.variantId } },
      },
    },
  };
}

export async function createLemonCheckout(input: {
  accountId: string;
  email?: string;
  redirectUrl: string;
}): Promise<{ url: string } | { error: string }> {
  const config = getLemonSqueezyConfig();
  if (!config) {
    return { error: "Billing isn't configured." };
  }

  const storeId = parseLemonId(config.storeId);
  let variantId = parseLemonId(config.variantId);
  if (!storeId || !variantId) {
    return { error: RELATED_RESOURCE_HINT };
  }

  const postCheckout = (id: string) =>
    lsFetch(config.apiKey, "/checkouts", {
      method: "POST",
      body: JSON.stringify(
        checkoutPayload({
          storeId,
          variantId: id,
          accountId: input.accountId,
          email: input.email,
          redirectUrl: input.redirectUrl,
        })
      ),
    });

  let response = await postCheckout(variantId);
  let body = (await response.json()) as LemonBody;

  if (!response.ok) {
    const resolved = await variantIdFromProduct(config.apiKey, variantId, storeId);
    if (resolved && resolved !== variantId) {
      console.warn(
        "Lemon Squeezy VARIANT_ID looks like a product ID; retrying with variant",
        resolved
      );
      variantId = resolved;
      response = await postCheckout(variantId);
      body = (await response.json()) as LemonBody;
    }
  }

  const url = body.data?.attributes?.url;
  if (!response.ok || !url) {
    console.error("Lemon Squeezy checkout failed", response.status, {
      detail: body.errors?.[0]?.detail,
      pointer: body.errors?.[0]?.source?.pointer,
      storeId,
      variantId,
    });
    return { error: userFacingLemonError(response.status, body) };
  }

  return { url };
}
