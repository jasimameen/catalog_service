export const MONTHLY_PRICE_USD = "24.99";
export const MONTHLY_PRICE_LABEL = "$24.99/mo";
export const TRIAL_DAYS = 30;
export const TRIAL_DAYS_LABEL = "30 days free";

/** Trial / unpaid accounts. Paid and operator-comp default to unlimited. */
export const FREE_TIER_MAX_CATALOGS = 1;
/** `null` = no cap. Operator can still set `accounts.max_catalogs`. */
export const PAID_MAX_CATALOGS: number | null = null;

/**
 * Lemon Squeezy keeps charging whatever price is on the existing variant.
 * In-app copy is $24.99 — Jasim must change the Instant Catalog monthly
 * variant price in the Lemon Squeezy dashboard. Do not mint a new variant
 * or rotate LEMONSQUEEZY_* secrets unless checkout breaks.
 */
export const LEMON_SQUEEZY_PRICE_NOTE =
  "Lemon Squeezy → Instant Catalog → monthly subscription variant → set price to $24.99. Keep the same Variant ID in LEMONSQUEEZY_VARIANT_ID.";

/**
 * In-app trial length is TRIAL_DAYS (accounts.trial_ends_at default).
 * Lemon Squeezy has its own trial-days field on the variant — Jasim must
 * set that to 30 in the LS dashboard. Do not invent or rotate LS secrets.
 */
export const LEMON_SQUEEZY_TRIAL_NOTE =
  "Lemon Squeezy → Instant Catalog → monthly subscription variant → trial period → 30 days. Keep the same Variant ID.";
