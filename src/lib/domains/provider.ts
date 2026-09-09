export type DomainProviderName = "manual" | "vercel" | "cloudflare";

export function getDomainProvider(): DomainProviderName {
  const raw = (process.env.DOMAIN_PROVIDER || "manual").toLowerCase();
  if (raw === "vercel" || raw === "cloudflare") return raw;
  return "manual";
}

/**
 * The hostname a customer's CNAME record must point to. Every provider mode
 * still needs this for the DNS check itself — vercel/cloudflare additionally
 * register the domain with their API once DNS resolves correctly, but the
 * customer-facing instructions (and the "Check now" verification) are the
 * same shape regardless of mode.
 */
export function getExpectedCnameTarget(): string {
  const provider = getDomainProvider();
  if (provider === "vercel") {
    return "cname.vercel-dns.com";
  }
  // manual and cloudflare modes both point at our own fallback origin —
  // cloudflare mode additionally registers it as a Custom Hostname there.
  return process.env.CLOUDFLARE_FALLBACK_ORIGIN || `edge.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"}`;
}
