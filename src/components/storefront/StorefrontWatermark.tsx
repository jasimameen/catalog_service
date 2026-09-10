import { PRODUCT_NAME, PRODUCT_URL } from "@/lib/brand";

/** Always-on promo. Lives in the storefront shell — Look settings cannot hide it. */
export function StorefrontWatermark() {
  return (
    <p className="px-4 py-5 text-center text-[11px] tracking-wide text-[var(--cat-muted)] print:hidden">
      <a
        href={PRODUCT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline"
      >
        Powered by {PRODUCT_NAME}
      </a>
    </p>
  );
}
