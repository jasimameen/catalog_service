# Setup

Copy `.env.example` to `.env.local`. Then do this once:

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run [`supabase/schema.sql`](supabase/schema.sql).
3. **SQL Editor** → run [`supabase/seed.sql`](supabase/seed.sql).
4. **Settings → API Keys** — paste into `.env.local`:
   - Project URL → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` (same value)
   - Publishable key → `SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same value)
   - Secret key → `SUPABASE_SECRET_KEY` (server-only; replace the `your-secret-key` placeholder with the real secret from the dashboard)
5. Set `NEXT_PUBLIC_ROOT_DOMAIN` to `localhost:3000` locally, or `catalog.hevyf.com` in production.
6. Optional — order email on checkout: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `ORDER_FROM_EMAIL`.
7. Optional — item photo uploads: **SQL Editor** → run [`supabase/catalog-images.sql`](supabase/catalog-images.sql) (creates the public `catalog-images` bucket).
8. Billing — **SQL Editor** → run [`supabase/billing.sql`](supabase/billing.sql) (Lemon Squeezy columns on `accounts`). Then see **Lemon Squeezy** below.

The Publishable key is the same kind of public key as the old `anon` key (the JWT still has `"role":"anon"`). The Secret key replaces `service_role`. Old env names still work if you already have them.

## Lemon Squeezy ($19.99/month)

1. Create an account at [lemonsqueezy.com](https://lemonsqueezy.com) and a **Store**.
2. **Products → New product** named **Instant Catalog**.
3. Add a **subscription variant** at **$19.99 / month**.
4. Copy the **Store ID** (Settings → Stores) into `LEMONSQUEEZY_STORE_ID`.
5. **Settings → API** → create an API key → `LEMONSQUEEZY_API_KEY`.
6. Open the Instant Catalog variant and copy its **Variant ID** → `LEMONSQUEEZY_VARIANT_ID`.
7. **Settings → Webhooks → +** with URL `https://catalog.hevyf.com/api/billing/webhook` (or `LEMONSQUEEZY_WEBHOOK_URL`). Signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET`.
8. Subscribe the webhook to: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_success`.
9. Paste the four env vars in `.env.local` locally and in Vercel (see [`DEPLOY.md`](DEPLOY.md)).

Until those four vars are set, Admin shows **Billing isn’t configured** on the Subscribe button (same idea as SMTP).

Custom domains: [`CLOUDFLARE.md`](CLOUDFLARE.md). Hosting: [`DEPLOY.md`](DEPLOY.md).

```bash
npm install && npm run dev
```
