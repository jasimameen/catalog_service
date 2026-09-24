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
6. Optional — order, welcome, password-changed, and reset emails: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `ORDER_FROM_EMAIL`. Checkout still saves without these. If messages do not arrive, see **Emails not arriving** below.
7. Optional — item photo uploads: **SQL Editor** → run [`supabase/catalog-images.sql`](supabase/catalog-images.sql) (creates the public `catalog-images` bucket).
8. Billing — **SQL Editor** → run [`supabase/billing.sql`](supabase/billing.sql) (Lemon Squeezy columns on `accounts`). Then see **Lemon Squeezy** below.
8b. Comp / catalog caps — **SQL Editor** → run [`supabase/account-comp.sql`](supabase/account-comp.sql) (`accounts.comp`, `accounts.max_catalogs`). Operator desk → Users → Grant. Trial default is 1 catalog; paid is unlimited unless you set a cap. `@hevyf.com` / operator emails are always unlimited.
9. Restaurant ordering — **SQL Editor** → run [`supabase/restaurant.sql`](supabase/restaurant.sql) (item variants, dine-in/pickup/delivery, kitchen status, custom checkout form). Safe to skip for trade catalogs.
10. Concierge inquiries — **SQL Editor** → run [`supabase/setup-inquiries.sql`](supabase/setup-inquiries.sql) (private `setup-inquiries` bucket + inbox table). Optional demo catalog: [`supabase/harbor-demo.sql`](supabase/harbor-demo.sql) (slug `harbor`, generic restaurant — not Tea Day).

The Publishable key is the same kind of public key as the old `anon` key (the JWT still has `"role":"anon"`). The Secret key replaces `service_role`. Old env names still work if you already have them.

## Auth redirect URLs (password reset)

Reset emails use the current site origin — no extra env vars. In Supabase **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000` locally and `https://catalog.hevyf.com` in production. Add these **Redirect URLs**:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/reset-password`
- `https://catalog.hevyf.com/auth/callback`
- `https://catalog.hevyf.com/reset-password`

The app sends `redirectTo` as `{origin}/auth/callback?next=/reset-password` (same callback as sign-up confirm).

## Emails not arriving

App mail (orders, welcome, password-changed, forgot-password reset, and signup OTP) uses nodemailer + the `SMTP_*` vars — not Supabase Auth’s mailer.

Use Google Workspace SMTP relay (`smtp-relay.gmail.com`, port 587, STARTTLS) and turn on **Require SMTP Authentication** in Admin Console → Apps → Google Workspace → Gmail → Routing → SMTP relay service. `ORDER_FROM_EMAIL` must be an address in your Workspace domain.

If messages do not arrive:

1. Set `SMTP_HOST=smtp-relay.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, and keep `SMTP_USER` / `SMTP_PASS` / `ORDER_FROM_EMAIL`.
2. Vercel project **catalog-service** → **Settings → Environment Variables** → set the same `SMTP_*` and `ORDER_FROM_EMAIL` on **Production and Preview**. Redeploy after saving.
3. In admin **Settings**, use **Send test email**. If it arrives, app mail (including signup OTP) works.

## Lemon Squeezy ($24.99/month)

In-app billing copy is **$24.99/mo** after **30 days free**. The **variant ID stays the same** (`LEMONSQUEEZY_VARIANT_ID`). Do not create a new variant or rotate API secrets for this price change.

**Jasim — dashboard click:** Lemon Squeezy → Instant Catalog product → the existing monthly subscription variant → set price to **$24.99**, and set the variant **trial period to 30 days**. Existing subscribers keep their current price until you migrate them in Lemon Squeezy. New Instant Catalog accounts use `accounts.trial_ends_at` default of 30 days (`supabase/trial-30-days.sql`).

1. Create an account at [lemonsqueezy.com](https://lemonsqueezy.com) and a **Store**.
2. **Products → New product** named **Instant Catalog**.
3. Add a **subscription variant** at **$24.99 / month**.
4. Copy the **Store ID** (Settings → Stores) into `LEMONSQUEEZY_STORE_ID`.
5. **Settings → API** → create an API key → `LEMONSQUEEZY_API_KEY`.
6. Open Instant Catalog → the **$24.99 / month** variant → **Copy ID**. That is the **Variant ID** (not the product ID in the URL) → `LEMONSQUEEZY_VARIANT_ID`. Use a Test API key only with Test-mode variants (or Live with Live).
7. **Settings → Webhooks → +** with URL `https://catalog.hevyf.com/api/billing/webhook` (or `LEMONSQUEEZY_WEBHOOK_URL`). Signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET`.
8. Subscribe the webhook to: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_success`.
9. Paste the four env vars in `.env.local` locally and in Vercel (see [`DEPLOY.md`](DEPLOY.md)).

Until those four vars are set, Admin shows **Billing isn’t configured** on the Subscribe button (same idea as SMTP).

Custom domains: [`CLOUDFLARE.md`](CLOUDFLARE.md). Hosting: [`DEPLOY.md`](DEPLOY.md).

```bash
npm install && npm run dev
```
