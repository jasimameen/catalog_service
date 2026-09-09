# Cloudflare & domains

Two separate things use Cloudflare here: (1) DNS for **your own** platform domain
(`catalog.hevyf.com`), which every tenant's subdomain depends on, and (2) optionally,
verifying **customers'** custom domains automatically. Do (1) first — it's required. (2) has a
zero-config fallback that works today with no Cloudflare API access at all.

## 1. Your platform's DNS (required, one-time)

Wherever you end up hosting the Next.js app (Vercel, a VPS, Cloudflare Pages/Workers — this repo
doesn't assume any particular host), you need two DNS records in your `hevyf.com` Cloudflare
zone:

| Type | Name | Value |
| --- | --- | --- |
| CNAME (or A) | `catalog` | your hosting target (e.g. `cname.vercel-dns.com`, or your server's IP as an A record) |
| CNAME | `*.catalog` | the same target as above |

The wildcard record is what makes every `{slug}.catalog.hevyf.com` work automatically the moment
a catalog is created — the app's own routing (`src/proxy.ts`) resolves the slug against the
database, nothing else needs configuring per-catalog.

**Recommended: leave both records proxied (orange cloud) through Cloudflare.** Cloudflare's free
Universal SSL certificate automatically covers one level of wildcard (`*.catalog.hevyf.com`), so
this alone gives every tenant subdomain valid HTTPS with no extra Cloudflare product, no Workers,
and no dependency on your hosting platform's own TLS handling for subdomains — it works
identically whether you host on Vercel, a plain VPS, or anything else. Set Cloudflare's SSL/TLS
mode to **Full** (or **Full (strict)** once your origin has its own valid cert) so the
Cloudflare→origin leg is also encrypted.

Once that's live, set `NEXT_PUBLIC_SUPABASE_URL`... er, `NEXT_PUBLIC_ROOT_DOMAIN=catalog.hevyf.com`
in your production environment.

## 2. Customer custom domains (optional, per-tenant)

A tenant can add their own domain (e.g. `catalog.theircompany.com`) from **Domains** in the
dashboard. Set `DOMAIN_PROVIDER` in your env to pick how it's verified:

### `manual` (default — works today, zero setup)

The customer adds one CNAME record pointing at `CLOUDFLARE_FALLBACK_ORIGIN` (defaults to
`edge.<your root domain>` — set this env var to whatever hostname you're actually routing
tenant traffic through). "Check now" in the dashboard does a live DNS-over-HTTPS lookup
(via Cloudflare's own public resolver — no API key needed) and marks the domain "DNS verified"
the moment the CNAME resolves correctly.

**The gap in this mode:** DNS verifying doesn't automatically provision TLS/routing for that
exact hostname — you still need to add the domain to whatever serves the app so it actually
answers requests for it. If you're on the "proxied wildcard through Cloudflare" setup from
part 1, this is still a manual step per custom domain (Cloudflare's free wildcard cert only
covers `*.catalog.hevyf.com`, not an arbitrary third-party domain) — either upgrade to one of
the two automated modes below, or add the domain by hand.

### `vercel` (fully automatic, if hosting on Vercel)

Set `VERCEL_API_TOKEN` (a token from your Vercel account) and `VERCEL_PROJECT_ID`. The customer
CNAMEs to `cname.vercel-dns.com`; once DNS resolves, the app calls Vercel's Domains API to add
the domain to your project, and Vercel issues the certificate automatically. No manual step.

### `cloudflare` (fully automatic, requires Cloudflare for SaaS)

Cloudflare for SaaS (a paid add-on on your zone) lets *your* Cloudflare account manage TLS for
customers' domains that point at your infrastructure. Enable it on the `hevyf.com` zone, then
set `CLOUDFLARE_API_TOKEN` (with Custom Hostnames edit permission), `CLOUDFLARE_ZONE_ID`, and
`CLOUDFLARE_FALLBACK_ORIGIN` (the hostname your app actually listens on — Cloudflare proxies
verified custom hostnames to this origin). Once DNS resolves, the app registers the hostname via
the Custom Hostnames API and Cloudflare issues the certificate.

## Which should you pick?

Start with `manual` — it needs nothing from you right now and every tenant already gets a
working `{slug}.catalog.hevyf.com` regardless of this setting. Upgrade to `vercel` or
`cloudflare` mode only once a real customer actually wants their own domain and you've decided
where to host.
