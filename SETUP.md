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
9. Restaurant ordering — **SQL Editor** → run [`supabase/restaurant.sql`](supabase/restaurant.sql) (item variants, dine-in/pickup/delivery, kitchen status, custom checkout form). Safe to skip for trade catalogs.

The Publishable key is the same kind of public key as the old `anon` key (the JWT still has `"role":"anon"`). The Secret key replaces `service_role`. Old env names still work if you already have them.

## Auth redirect URLs (password reset)

Reset emails use the current site origin — no extra env vars. In Supabase **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000` locally and `https://catalog.hevyf.com` in production. Add these **Redirect URLs**:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/reset-password`
- `https://catalog.hevyf.com/auth/callback`
- `https://catalog.hevyf.com/reset-password`

The app sends `redirectTo` as `{origin}/auth/callback?next=/reset-password` (same callback as sign-up confirm).

## Emails not arriving

App mail (orders, welcome, password-changed, forgot-password reset link) uses nodemailer + the `SMTP_*` vars. Signup confirmation still uses **Supabase Auth’s** mailer.

If reset / confirm never shows up:

1. Google Account for the SMTP user → **Security** → **2-Step Verification** → **App passwords** → create one for Mail. Copy the 16-character password.
2. Put it in `.env.local` as `SMTP_PASS` (and keep `SMTP_HOST` / `SMTP_USER` / `ORDER_FROM_EMAIL`).
3. Vercel project **catalog-service** → **Settings → Environment Variables** → set the same `SMTP_*` and `ORDER_FROM_EMAIL` on **Production and Preview** (Preview currently has none). Redeploy after saving.
4. Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP and paste the **same** host, user, and new app password. Signup confirm emails will keep failing with `535 Username and Password not accepted` until this matches.
5. In admin **Settings**, use **Send test email**. If it arrives, app mail works; if confirm still fails, only the Supabase dashboard SMTP is stale.

## Lemon Squeezy ($19.99/month)

1. Create an account at [lemonsqueezy.com](https://lemonsqueezy.com) and a **Store**.
2. **Products → New product** named **Instant Catalog**.
3. Add a **subscription variant** at **$19.99 / month**.
4. Copy the **Store ID** (Settings → Stores) into `LEMONSQUEEZY_STORE_ID`.
5. **Settings → API** → create an API key → `LEMONSQUEEZY_API_KEY`.
6. Open Instant Catalog → the **$19.99 / month** variant → **Copy ID**. That is the **Variant ID** (not the product ID in the URL) → `LEMONSQUEEZY_VARIANT_ID`. Use a Test API key only with Test-mode variants (or Live with Live).
7. **Settings → Webhooks → +** with URL `https://catalog.hevyf.com/api/billing/webhook` (or `LEMONSQUEEZY_WEBHOOK_URL`). Signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET`.
8. Subscribe the webhook to: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_success`.
9. Paste the four env vars in `.env.local` locally and in Vercel (see [`DEPLOY.md`](DEPLOY.md)).

Until those four vars are set, Admin shows **Billing isn’t configured** on the Subscribe button (same idea as SMTP).

Custom domains: [`CLOUDFLARE.md`](CLOUDFLARE.md). Hosting: [`DEPLOY.md`](DEPLOY.md).

```bash
npm install && npm run dev
```
