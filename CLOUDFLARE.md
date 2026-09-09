# Custom domains

Every catalog already gets `{slug}.catalog.hevyf.com`. Customer-owned domains need one of the modes below.

## Platform DNS (once)

On the `hevyf.com` Cloudflare zone:

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| CNAME | `catalog` | your host (e.g. `cname.vercel-dns.com`) | Proxied |
| CNAME | `*.catalog` | same target | Proxied |

SSL/TLS mode: **Full**. Then set `NEXT_PUBLIC_ROOT_DOMAIN=catalog.hevyf.com`.

## Connect Cloudflare (recommended)

1. On the `hevyf.com` zone: **SSL/TLS → Custom Hostnames** → enable **Cloudflare for SaaS**.
2. Set the **fallback origin** to a hostname that already reaches this app (e.g. `edge.catalog.hevyf.com`). Add a DNS record for that hostname pointing at the same host as `catalog`.
3. **Create API token** → custom token → **Zone / Custom Hostnames / Edit** on the `hevyf.com` zone.
4. Copy **Zone ID** from the `hevyf.com` overview sidebar (the zone where SaaS is enabled — not a subdomain).
5. Paste:

```
DOMAIN_PROVIDER=cloudflare
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_FALLBACK_ORIGIN=edge.catalog.hevyf.com
```

Customers CNAME their domain to `CLOUDFLARE_FALLBACK_ORIGIN`. **Check now** in admin registers the hostname; Cloudflare issues TLS.

## Vercel instead

If the app is hosted on Vercel:

```
DOMAIN_PROVIDER=vercel
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
```

`VERCEL_TEAM_ID` only if the project lives on a team. Customers CNAME to `cname.vercel-dns.com`. **Check now** adds the domain to the Vercel project; Vercel issues TLS.

## Manual (no API)

Leave `DOMAIN_PROVIDER` unset (defaults to `manual`). Customers CNAME to `CLOUDFLARE_FALLBACK_ORIGIN` (defaults to `edge.<NEXT_PUBLIC_ROOT_DOMAIN>`). **Check now** only confirms DNS — add the hostname on the host yourself for TLS.
