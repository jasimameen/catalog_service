import "server-only";

/**
 * Live DNS-over-HTTPS CNAME check via Cloudflare's own public resolver.
 * Needs no API key or account — works regardless of who actually hosts the
 * customer's DNS (Cloudflare, GoDaddy, Route53, anything). This is the
 * "manual" provider's entire verification mechanism, and every other
 * provider mode uses it too as the first step before registering the domain
 * with that provider's API.
 */
const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const CNAME_RECORD_TYPE = 5;

export interface CnameCheckResult {
  matches: boolean;
  foundTarget: string | null;
}

function normalize(hostname: string): string {
  return hostname.trim().replace(/\.$/, "").toLowerCase();
}

export async function checkCname(hostname: string, expectedTarget: string): Promise<CnameCheckResult> {
  try {
    const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=CNAME`;
    const res = await fetch(url, {
      headers: { accept: "application/dns-json" },
      cache: "no-store",
    });
    if (!res.ok) return { matches: false, foundTarget: null };

    const data: { Answer?: { type: number; data: string }[] } = await res.json();
    const record = (data.Answer ?? []).find((a) => a.type === CNAME_RECORD_TYPE);
    const foundTarget = record ? normalize(record.data) : null;
    return { matches: foundTarget === normalize(expectedTarget), foundTarget };
  } catch {
    return { matches: false, foundTarget: null };
  }
}
