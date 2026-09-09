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

The Publishable key is the same kind of public key as the old `anon` key (the JWT still has `"role":"anon"`). The Secret key replaces `service_role`. Old env names still work if you already have them.

Custom domains: [`CLOUDFLARE.md`](CLOUDFLARE.md). Hosting: [`DEPLOY.md`](DEPLOY.md).

```bash
npm install && npm run dev
```
