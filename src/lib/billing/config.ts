import "server-only";

export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_ID &&
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  );
}

export function getLemonSqueezyConfig() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!apiKey || !storeId || !variantId || !webhookSecret) {
    return null;
  }

  return { apiKey, storeId, variantId, webhookSecret };
}
