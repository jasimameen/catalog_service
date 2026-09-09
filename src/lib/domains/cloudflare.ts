import "server-only";

/**
 * Cloudflare for SaaS — Custom Hostnames API. Only used when
 * DOMAIN_PROVIDER=cloudflare and CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID are
 * set. This requires "Cloudflare for SaaS" to be enabled on the zone (a paid
 * add-on) — see CLOUDFLARE.md. The customer's CNAME still points at
 * CLOUDFLARE_FALLBACK_ORIGIN; this call registers the hostname so Cloudflare
 * auto-provisions and renews its TLS certificate.
 */
export function isCloudflareConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID);
}

export async function createCustomHostname(hostname: string): Promise<{ ok: boolean; error?: string }> {
  if (!isCloudflareConfigured()) return { ok: false, error: "Cloudflare isn't configured." };

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv" } }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (res.ok && body?.success) return { ok: true };

  // Already registered — treat as success.
  const alreadyExists = (body?.errors ?? []).some((e: { code?: number }) => e.code === 1406);
  if (alreadyExists) return { ok: true };

  return { ok: false, error: body?.errors?.[0]?.message || `Cloudflare API error (${res.status})` };
}
