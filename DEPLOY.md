# Deploying

This is a standard Next.js 16 App Router project — no platform-specific adapter is baked in, so
it deploys anywhere Next.js does. Two paths:

## Option A — Vercel (least setup)

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add every env var from `.env.example` under **Project Settings → Environment Variables**
   (set `NEXT_PUBLIC_ROOT_DOMAIN=catalog.hevyf.com` for production).
3. **Project Settings → Domains** — add `catalog.hevyf.com` and, importantly, enable
   **Wildcard Domains** (Vercel Pro+) and add `*.catalog.hevyf.com`, so every `{slug}.catalog.
   hevyf.com` resolves without adding each one by hand. If you're not on a plan with wildcard
   domain support, use the Cloudflare-proxied-wildcard approach in `CLOUDFLARE.md` part 1
   instead — point Cloudflare's wildcard CNAME straight at `cname.vercel-dns.com` and let
   Cloudflare's own wildcard cert handle TLS instead of Vercel's.
4. Point your Cloudflare DNS at Vercel per `CLOUDFLARE.md`.
5. If you want customer custom domains to verify and get TLS automatically (not just the DNS
   check), set `DOMAIN_PROVIDER=vercel` + `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` — see
   `CLOUDFLARE.md` part 2.

## Option B — self-host (Node server, any VPS/container host)

1. `npm run build && npm run start` (reads `PORT` env var, defaults to 3000).
2. Put Cloudflare in front of it per `CLOUDFLARE.md` part 1 (proxied wildcard CNAME/A record) —
   this gets you TLS for every subdomain for free via Cloudflare's Universal SSL, with the
   origin server only needing to speak plain HTTP to Cloudflare (set Cloudflare's SSL mode to
   **Flexible**, or terminate TLS yourself and use **Full**).
3. `DOMAIN_PROVIDER=cloudflare` is the natural fit here if you also want customer custom domains
   automated — see `CLOUDFLARE.md` part 2.

## Either way

- Run the Supabase setup in `SETUP.md` first — the app needs `NEXT_PUBLIC_SUPABASE_URL` etc. to
  do anything beyond render the marketing page and a "not configured" notice on storefronts.
- `src/proxy.ts` does all tenant routing at the application layer (no platform-specific rewrite
  rules needed) — any host that can run a standard Next.js server handles multi-tenancy
  correctly once DNS points every subdomain at it.
