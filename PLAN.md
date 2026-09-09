# Instant Catalog — SaaS rebuild plan

**Status file. Read this first if resuming in Cursor or a new Claude Code session.**
Update the checklist below as work lands. Each phase is committed to git separately on the
`saas-platform` branch so you can see exactly how far it got from `git log`.

## ⏸ Resume point (session paused here — approaching usage limit)

**All 10 phases are now done and committed** on `saas-platform` (`git log` shows every commit).
`npx tsc --noEmit -p tsconfig.json` and `npx eslint .` both pass clean across the whole project
as of the last commit. The Admin app and Catalog Builder wizard (built by two parallel
subagents) finished successfully and were reviewed + verified together before committing.

### The one known gap: Domains "Check now" isn't wired up

`src/lib/domains/verify.ts` and `POST /api/admin/domains/verify` (the DNS-check endpoint) were
built in this session, but the Admin agent building `src/app/admin/[catalogId]/domains/page.tsx`
started before that endpoint existed, so its Domains page can add/remove/rename domains but has
no "Check now" button calling it. **To finish:** open
`src/app/admin/[catalogId]/domains/{page.tsx,DomainsClient.tsx}`, add a "Check now" button per
custom domain that `POST`s to `/api/admin/domains/verify` with `{ domainId }`, and shows the
returned `{ status, message }`. Small, self-contained — should take one focused pass.

### What's genuinely untested

Nothing here has run against a **real Supabase project** — this environment has no
`.env.local`. Every "not configured" fallback path was verified (graceful errors, no crashes),
but the actual sign-up → build a catalog → publish → place an order → see it in Admin flow has
only been verified by reading the code and type-checking it, not by clicking through it. Do
`SETUP.md` first (5 minutes: create a Supabase project, run `schema.sql` then `seed.sql`, fill
`.env.local`), then click through that full flow once for real before calling this done.

### Known gaps (by design, see the section below for full detail)

No billing/payment integration (UI is static), no team-invite UI, and in `manual` domain-provider
mode DNS verification doesn't by itself provision TLS for a custom domain (see `CLOUDFLARE.md`).

## What this is

Turning the single-tenant Kleaner catalogue app into `catalog.hevyf.com` — a multi-tenant SaaS
where anyone signs up, adds items, picks one of 4 templates, and gets a live ordering catalogue
on `{slug}.catalog.hevyf.com` (or their own custom domain) in ~5 minutes. Spec source: the 6
design screens in `~/Downloads/Instant Catalog SaaS Platform.zip` (Landing, Admin, Catalog
Builder desktop+mobile, Catalog Templates, and the current Kleaner catalogue as the reference
"Trade Grid" template). Full extracted copy/behavior notes are in
[`design/DESIGN_NOTES.md`](design/DESIGN_NOTES.md).

The existing 112-product Kleaner catalogue becomes the **first seeded tenant** (`kleaner`),
not a separate thing — its current UI is the "Trade Grid" template.

## Architecture decisions

- **Next.js App Router**, staying on the existing Next 16 / React 19 / Tailwind v4 stack.
- **Database/auth: Supabase** (Postgres + Supabase Auth, email+password). One `accounts` row
  per signed-up company; `account_members` joins users to accounts (schema supports multiple
  members per account now, invite UI is not built yet — see Known gaps).
- **Multi-tenancy via `middleware.ts`** reading the `Host` header:
  - apex/root domain (`catalog.hevyf.com`, or `localhost:3000` in dev) → marketing site + `/admin`
    app (auth-gated) + `/auth` sign in/up.
  - `{slug}.catalog.hevyf.com` or any hostname found in the `domains` table → rewritten to
    `/s/[catalogId]` storefront render, resolved server-side against Supabase.
- **Two Supabase clients**:
  - `getServiceClient()` — service-role key, server-only. Used for all public storefront reads
    (so RLS can stay locked to account members only) and for writing orders.
  - `getServerSupabase()` / `getBrowserSupabase()` — anon key + user session, used everywhere in
    `/admin` so Postgres RLS enforces "only this account's data" automatically.
- **Domain verification is provider-pluggable** (`DOMAIN_PROVIDER` env var), because we don't
  know your hosting target yet and shouldn't assume Cloudflare Workers just because your DNS is
  on Cloudflare:
  - `manual` (default, zero config): live DNS-over-HTTPS lookup (via Cloudflare's own public
    `cloudflare-dns.com/dns-query` resolver — no API key needed) confirms the CNAME, marks the
    domain "DNS verified" in our DB. TLS/routing still needs the domain added on whatever host
    serves the app.
  - `vercel` (optional): if `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` are set, we call Vercel's
    Domains API to add+verify+auto-cert the domain — this makes it fully automatic if you deploy
    on Vercel.
  - `cloudflare` (optional): if `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` are set, we use
    Cloudflare for SaaS Custom Hostnames API instead.
  - See [`CLOUDFLARE.md`](CLOUDFLARE.md) for exact setup per mode.
- **Orders**: still emailed via nodemailer/SMTP (per-account `order_email`), now also written to
  Supabase (`orders` + `order_items`) so the Admin inbox and CSV export work. Prices are always
  recomputed server-side from `catalog_items` — client-sent prices are never trusted (unchanged
  behavior from the current single-tenant route).
- **Billing**: the $19/mo trial card is UI-only for now. No payment processor is wired up — I'm
  not fabricating a working charge flow without your Stripe (or other processor) keys. See
  Known gaps.

## Data model (Supabase Postgres)

Full SQL in [`supabase/schema.sql`](supabase/schema.sql). Tables: `accounts`,
`account_members`, `catalogs`, `catalog_items`, `domains`, `orders`, `order_items`,
`catalog_views`. RLS restricts everything to `auth.uid()` being a member of the owning account;
public storefront/order-write paths go through the service-role client instead of relaxing RLS.

## File map (new/changed)

```
middleware.ts                          host-based tenant routing
src/lib/supabase/{client,server,service}.ts
src/lib/catalog/templates.ts           template registry (grid/lookbook/menu/pricelist)
src/lib/catalog/currency.ts
src/lib/domains/{manual,vercel,cloudflare}.ts + verify.ts
src/app/(marketing)/page.tsx           Landing.dc.html rebuilt
src/app/(marketing)/templates/page.tsx Catalog Templates.dc.html rebuilt
src/app/auth/sign-in/, sign-up/        Supabase Auth
src/app/admin/layout.tsx               Admin.dc.html shell (responsive sidebar)
src/app/admin/(catalogs list, [catalogId]/dashboard|orders|items|domains, settings)
src/app/new/[[...step]]/page.tsx       Catalog Builder.dc.html + mobile, 3-step wizard
src/app/s/[catalogId]/page.tsx         public storefront, renders the active template
src/app/api/catalog/order/route.ts     generalized to any catalogId
src/app/api/admin/domains/route.ts     add/verify/remove custom domain
src/components/templates/{Grid,Lookbook,Menu,PriceList}.tsx
supabase/schema.sql
supabase/seed.sql                      seeds the "kleaner" tenant from src/data/catalog-products.ts
.env.example
SETUP.md / CLOUDFLARE.md / DEPLOY.md
```

## Checklist

- [x] Read all design files, write this plan
- [x] Phase 1 — Foundation: deps, schema.sql, supabase clients, `src/proxy.ts` (tenant routing —
      note it's `proxy.ts` not `middleware.ts`, renamed in Next 16), template registry,
      currency/shared helpers. Committed, type-checked, lint-clean, smoke-tested via dev server.
- [x] Phase 2 — Auth: sign-in/up pages + API routes, account auto-provisioning on first sign-up.
      Committed. Verified the graceful "Supabase not configured" path; real sign-up/sign-in
      against a live Supabase project is NOT yet tested (none configured in this environment).
- [x] Phase 3 — Storefront generalization: 4 template components (Grid/Lookbook/Menu/PriceList),
      `/s/[host]`, cart keyed per catalog, order API generalized + writes to Supabase. Committed,
      type-checked, smoke-tested (tenant routing + graceful fallbacks confirmed in-browser).
- [x] Phase 4 — Admin app: shell + catalogs list + per-catalog dashboard/orders/items/domains +
      account settings. Committed, type-checked, lint-clean.
- [x] Phase 5 — Domains: `domains` table wiring (in schema.sql), manual DNS-check verifier
      (`src/lib/domains/dns.ts`), Vercel + Cloudflare provider modules, `/api/admin/domains/
      verify` route. Type-checked. **Not yet called from the Admin Domains page** — see
      "Resume point" above, this is the one remaining loose end.
- [x] Phase 6 — Catalog Builder: 3-step wizard, responsive (edit/preview tabs on mobile instead
      of separate phone-chrome), publish flow writing to Supabase. Committed, type-checked.
- [x] Phase 7 — Marketing site: Landing page (`src/app/page.tsx`), Templates gallery
      (`src/app/templates/page.tsx`). Committed, smoke-tested in-browser.
- [x] Phase 8 — Seed data: `scripts/generate-seed.mjs` generates `supabase/seed.sql` from
      `src/data/catalog-products.ts` (112 items). Committed. NOT yet run against a real Supabase
      project — do that as part of SETUP.md step 5 once a project exists.
- [x] Phase 9 — Docs: `.env.example`, `SETUP.md`, `CLOUDFLARE.md`, `DEPLOY.md`. Committed.
- [x] Phase 10 — Build/lint pass: `npx tsc --noEmit` and `npx eslint .` both clean across the
      whole project. **Not done yet:** wire Domains "Check now" (above), and a real manual
      click-through against a live Supabase project — do that next.

## Known gaps (deliberately not built — flagging rather than silently skipping)

- **Billing**: no Stripe/payment integration. Trial countdown and "Add payment method" are
  static UI. Wire this up once you pick a processor and can give me test keys.
- **Team invites**: schema supports multiple `account_members` but there's no invite-by-email
  UI yet — only the signed-up owner exists on an account.
- **TLS for custom domains in `manual` mode**: DNS verification works with zero config, but
  actually serving HTTPS on a customer's custom domain requires the domain to be added on
  whichever host runs the app (automatic if `vercel` mode is configured; manual one-time step
  otherwise). Documented in `CLOUDFLARE.md`.
- **Analytics**: `catalog_views` is a raw event table with a simple count; no funnel/graph, just
  the numbers the Admin dashboard design shows.

## Env vars you'll need to set (see `.env.example` for the full list)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — from
  your Supabase project settings.
- `NEXT_PUBLIC_ROOT_DOMAIN` — e.g. `catalog.hevyf.com` (defaults to `localhost:3000` in dev).
- `SMTP_*`, `ORDER_FROM_EMAIL` — already existed, unchanged.
- Optional: `DOMAIN_PROVIDER`, `VERCEL_API_TOKEN`/`VERCEL_PROJECT_ID`, or
  `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ZONE_ID`/`CLOUDFLARE_FALLBACK_ORIGIN`.
