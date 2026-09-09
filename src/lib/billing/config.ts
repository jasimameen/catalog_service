import "server-only";

function env(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "");
}

export function isBillingConfigured(): boolean {
  return Boolean(
    env("LEMONSQUEEZY_API_KEY") &&
      env("LEMONSQUEEZY_STORE_ID") &&
      env("LEMONSQUEEZY_VARIANT_ID") &&
      env("LEMONSQUEEZY_WEBHOOK_SECRET")
  );
}

export function getLemonSqueezyConfig() {
  const apiKey = env("LEMONSQUEEZY_API_KEY");
  const storeId = env("LEMONSQUEEZY_STORE_ID");
  const variantId = env("LEMONSQUEEZY_VARIANT_ID");
  const webhookSecret = env("LEMONSQUEEZY_WEBHOOK_SECRET");

  if (!apiKey || !storeId || !variantId || !webhookSecret) {
    return null;
  }

  return { apiKey, storeId, variantId, webhookSecret };
}
